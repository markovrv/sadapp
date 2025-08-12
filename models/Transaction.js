const db = require('../config/database');

class Transaction {
    // Получить все транзакции
    static async getAll(limit = 50, offset = 0) {
        try {
            // Преобразуем параметры в числа для безопасности
            const limitNum = parseInt(limit) || 50;
            const offsetNum = parseInt(offset) || 0;

            const [rows] = await db.execute(`
                SELECT t.*, 
                       p.first_name, p.last_name, p.child_name,
                       pa.balance as personal_balance,
                       ga.balance as group_balance
                FROM transactions t
                LEFT JOIN participants p ON t.participant_id = p.id
                LEFT JOIN personal_accounts pa ON t.personal_account_id = pa.id
                LEFT JOIN group_account ga ON t.group_account_id = ga.id
                ORDER BY t.created_at DESC
                LIMIT ${limitNum} OFFSET ${offsetNum}
            `);
            return rows;
        } catch (error) {
            throw new Error(`Ошибка при получении транзакций: ${error.message}`);
        }
    }

    // Transaction.js - обновленный метод getByParticipant
    static async getByParticipant(participantId, limit = 50, offset = 0) {
        try {
            const limitNum = parseInt(limit) || 50;
            const offsetNum = parseInt(offset) || 0;
            const participantIdNum = parseInt(participantId);

            // Получаем все транзакции участника (взносы и распределенные расходы)
            const [rows] = await db.execute(`
            SELECT 
                t.id,
                t.type,
                t.amount,
                t.description,
                t.created_at,
                t.status,
                p.first_name, 
                p.last_name, 
                p.child_name,
                pa.balance as personal_balance,
                ga.balance as group_balance,
                -- Для расходов указываем сумму, снятую с этого участника
                CASE 
                    WHEN t.type = 'expense' THEN ed.amount
                    ELSE NULL
                END as participant_amount,
                -- Для расходов указываем общую сумму расхода
                CASE 
                    WHEN t.type = 'expense' THEN t.amount
                    ELSE NULL
                END as total_expense_amount
            FROM transactions t
            LEFT JOIN participants p ON t.participant_id = p.id
            LEFT JOIN personal_accounts pa ON t.personal_account_id = pa.id
            LEFT JOIN group_account ga ON t.group_account_id = ga.id
            LEFT JOIN expense_distributions ed ON t.id = ed.transaction_id AND ed.participant_id = ?
            WHERE 
                -- Взносы этого участника
                (t.type = 'contribution' AND t.participant_id = ? AND (t.status IS NULL OR t.status != 'cancelled'))
                OR
                -- Расходы, распределенные на этого участника (не отмененные)
                (t.type = 'expense' AND ed.participant_id IS NOT NULL AND (t.status IS NULL OR t.status != 'cancelled'))
            ORDER BY t.created_at DESC
        `, [participantIdNum, participantIdNum]);

            return rows;
        } catch (error) {
            throw new Error(`Ошибка при получении транзакций участника: ${error.message}`);
        }
    }

    // Создать взнос (пополнение лицевого счета)
    static async createContribution(participantId, amount, description, createdBy) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Преобразуем параметры в числа для безопасности
            const participantIdNum = parseInt(participantId);
            const amountNum = parseFloat(amount);
            const createdByNum = parseInt(createdBy);

            // Получаем лицевой счет участника
            const [accounts] = await connection.execute(`
                SELECT id FROM personal_accounts WHERE participant_id = ?
            `, [participantIdNum]);

            if (accounts.length === 0) {
                throw new Error('Лицевой счет участника не найден');
            }

            const personalAccountId = accounts[0].id;

            // Создаем транзакцию
            const [result] = await connection.execute(`
                INSERT INTO transactions (type, amount, description, participant_id, personal_account_id, created_by)
                VALUES ('contribution', ?, ?, ?, ?, ?)
            `, [amountNum, description, participantIdNum, personalAccountId, createdByNum]);

            // Пополняем лицевой счет
            await connection.execute(`
                UPDATE personal_accounts 
                SET balance = balance + ? 
                WHERE id = ?
            `, [amountNum, personalAccountId]);

            // Пополняем общий счет
            await connection.execute(`
                UPDATE group_account 
                SET balance = balance + ? 
                WHERE id = 1
            `, [amountNum]);

            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw new Error(`Ошибка при создании взноса: ${error.message}`);
        } finally {
            connection.release();
        }
    }

    // Создать расход (списание с общего счета и распределение по участникам)
    static async createExpense(amount, description, createdBy) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Преобразуем параметры в числа для безопасности
            const amountNum = parseFloat(amount);
            const createdByNum = parseInt(createdBy);

            // Проверяем баланс общего счета
            const [groupAccount] = await connection.execute(`
                SELECT balance FROM group_account WHERE id = 1
            `);

            if (groupAccount[0].balance < amountNum) {
                throw new Error('Недостаточно средств на общем счете');
            }

            // Получаем всех участников
            const [participants] = await connection.execute(`
                SELECT p.id, pa.id as account_id
                FROM participants p
                JOIN personal_accounts pa ON p.id = pa.participant_id
            `);

            if (participants.length === 0) {
                throw new Error('Нет участников для распределения расходов');
            }

            // Создаем транзакцию расхода
            const [result] = await connection.execute(`
                INSERT INTO transactions (type, amount, description, group_account_id, created_by)
                VALUES ('expense', ?, ?, 1, ?)
            `, [amountNum, description, createdByNum]);

            const transactionId = result.insertId;

            // Распределяем расход поровну между участниками
            const amountPerParticipant = amountNum / participants.length;

            for (const participant of participants) {
                // Создаем запись о распределении
                await connection.execute(`
                    INSERT INTO expense_distributions (transaction_id, participant_id, amount, personal_account_id)
                    VALUES (?, ?, ?, ?)
                `, [transactionId, participant.id, amountPerParticipant, participant.account_id]);

                // Списываем с лицевого счета участника
                await connection.execute(`
                    UPDATE personal_accounts 
                    SET balance = balance - ? 
                    WHERE id = ?
                `, [amountPerParticipant, participant.account_id]);
            }

            // Списываем с общего счета
            await connection.execute(`
                UPDATE group_account 
                SET balance = balance - ? 
                WHERE id = 1
            `, [amountNum]);

            await connection.commit();
            return transactionId;
        } catch (error) {
            await connection.rollback();
            throw new Error(`Ошибка при создании расхода: ${error.message}`);
        } finally {
            connection.release();
        }
    }

    // Получить статистику
    static async getStatistics() {
        try {
            const [stats] = await db.execute(`
                SELECT 
                    (SELECT balance FROM group_account WHERE id = 1) as group_balance,
                    (SELECT COUNT(*) FROM participants) as total_participants,
                    (SELECT COUNT(*) FROM transactions WHERE type = 'contribution' AND (status IS NULL OR status != 'cancelled')) as total_contributions,
                    (SELECT COUNT(*) FROM transactions WHERE type = 'expense' AND (status IS NULL OR status != 'cancelled')) as total_expenses,
                    (SELECT SUM(amount) FROM transactions WHERE type = 'contribution' AND (status IS NULL OR status != 'cancelled')) as total_contributed,
                    (SELECT SUM(amount) FROM transactions WHERE type = 'expense' AND (status IS NULL OR status != 'cancelled')) as total_spent
            `);
            return stats[0];
        } catch (error) {
            throw new Error(`Ошибка при получении статистики: ${error.message}`);
        }
    }

    // Получить распределение расходов по транзакции
    static async getExpenseDistribution(transactionId) {
        try {
            const transactionIdNum = parseInt(transactionId);
            const [rows] = await db.execute(`
                SELECT ed.*, p.first_name, p.last_name, p.child_name
                FROM expense_distributions ed
                JOIN participants p ON ed.participant_id = p.id
                WHERE ed.transaction_id = ?
                ORDER BY p.last_name, p.first_name
            `, [transactionIdNum]);
            return rows;
        } catch (error) {
            throw new Error(`Ошибка при получении распределения расходов: ${error.message}`);
        }
    }

    // Отмена транзакции
    static async cancelTransaction(transactionId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const transactionIdNum = parseInt(transactionId);

            // Получаем информацию о транзакции
            const [transaction] = await connection.execute(`
                SELECT * FROM transactions WHERE id = ?
            `, [transactionIdNum]);

            if (transaction.length === 0) {
                throw new Error('Транзакция не найдена');
            }

            const t = transaction[0];

            // В зависимости от типа транзакции выполняем отмену
            if (t.type === 'contribution') {
                // Отмена взноса - возвращаем средства
                await connection.execute(`
                    UPDATE personal_accounts 
                    SET balance = balance - ? 
                    WHERE id = ?
                `, [t.amount, t.personal_account_id]);

                await connection.execute(`
                    UPDATE group_account 
                    SET balance = balance - ? 
                    WHERE id = 1
                `, [t.amount]);

                // Помечаем транзакцию как отмененную
                await connection.execute(`
                    UPDATE transactions 
                    SET status = 'cancelled' 
                    WHERE id = ?
                `, [transactionIdNum]);

            } else if (t.type === 'expense') {
                // Отмена расхода - возвращаем средства участникам
                const distributions = await connection.execute(`
                    SELECT * FROM expense_distributions 
                    WHERE transaction_id = ?
                `, [transactionIdNum]);

                for (const dist of distributions[0]) {
                    await connection.execute(`
                        UPDATE personal_accounts 
                        SET balance = balance + ? 
                        WHERE id = ?
                    `, [dist.amount, dist.personal_account_id]);
                }

                // Возвращаем средства на общий счет
                await connection.execute(`
                    UPDATE group_account 
                    SET balance = balance + ? 
                    WHERE id = 1
                `, [t.amount]);

                // Помечаем транзакцию как отмененную
                await connection.execute(`
                    UPDATE transactions 
                    SET status = 'cancelled' 
                    WHERE id = ?
                `, [transactionIdNum]);
            } else {
                throw new Error('Невозможно отменить данный тип транзакции');
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw new Error(`Ошибка при отмене транзакции: ${error.message}`);
        } finally {
            connection.release();
        }
    }


    static async deleteTransaction(transactionId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const transactionIdNum = parseInt(transactionId);

            // Получаем информацию о транзакции
            const [transaction] = await connection.execute(`
            SELECT type, status, amount, personal_account_id 
            FROM transactions 
            WHERE id = ?
        `, [transactionIdNum]);

            if (transaction.length === 0) {
                throw new Error('Транзакция не найдена');
            }

            const t = transaction[0];

            if (t.type !== 'contribution') {
                throw new Error('Можно удалять только индивидуальные взносы');
            }

            // Если транзакция уже отменена, просто удаляем ее без изменения балансов
            if (t.status !== 'cancelled') {
                // Возвращаем средства только если транзакция не отменена
                await connection.execute(`
                UPDATE personal_accounts 
                SET balance = balance - ? 
                WHERE id = ?
            `, [t.amount, t.personal_account_id]);

                await connection.execute(`
                UPDATE group_account 
                SET balance = balance - ? 
                WHERE id = 1
            `, [t.amount]);
            }

            // Удаляем транзакцию в любом случае
            await connection.execute(`
            DELETE FROM transactions WHERE id = ?
        `, [transactionIdNum]);

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw new Error(`Ошибка при удалении транзакции: ${error.message}`);
        } finally {
            connection.release();
        }
    }

    // Перепроведение транзакции (только для отмененных)
    static async reapplyTransaction(transactionId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const transactionIdNum = parseInt(transactionId);

            // 1. Получаем информацию о транзакции
            const [transaction] = await connection.execute(`
            SELECT * FROM transactions 
            WHERE id = ? AND status = 'cancelled'
        `, [transactionIdNum]);

            if (transaction.length === 0) {
                throw new Error('Отмененная транзакция не найдена');
            }

            const t = transaction[0];

            // 2. Получаем текущий список участников
            const [participants] = await connection.execute(`
            SELECT p.id, pa.id as account_id
            FROM participants p
            JOIN personal_accounts pa ON p.id = pa.participant_id
        `);

            if (participants.length === 0) {
                throw new Error('Нет участников для распределения расходов');
            }

            // 3. Для расходов - распределяем сумму между всеми участниками
            if (t.type === 'expense') {
                const amountPerParticipant = t.amount / participants.length;

                // Удаляем старое распределение (если есть)
                await connection.execute(`
                DELETE FROM expense_distributions 
                WHERE transaction_id = ?
            `, [transactionIdNum]);

                // Создаем новое распределение для текущих участников
                for (const participant of participants) {
                    await connection.execute(`
                    INSERT INTO expense_distributions 
                    (transaction_id, participant_id, amount, personal_account_id)
                    VALUES (?, ?, ?, ?)
                `, [transactionIdNum, participant.id, amountPerParticipant, participant.account_id]);

                    // Списываем с лицевого счета участника
                    await connection.execute(`
                    UPDATE personal_accounts 
                    SET balance = balance - ? 
                    WHERE id = ?
                `, [amountPerParticipant, participant.account_id]);
                }

                // Списываем с общего счета
                await connection.execute(`
                UPDATE group_account 
                SET balance = balance - ? 
                WHERE id = 1
            `, [t.amount]);
            }
            // 4. Для взносов - просто восстанавливаем оригинальную операцию
            else if (t.type === 'contribution') {
                // Проверяем, существует ли еще лицевой счет
                const [account] = await connection.execute(`
                SELECT id FROM personal_accounts 
                WHERE id = ?
            `, [t.personal_account_id]);

                if (account.length === 0) {
                    throw new Error('Лицевой счет не найден');
                }

                // Пополняем лицевой счет
                await connection.execute(`
                UPDATE personal_accounts 
                SET balance = balance + ? 
                WHERE id = ?
            `, [t.amount, t.personal_account_id]);

                // Пополняем общий счет
                await connection.execute(`
                UPDATE group_account 
                SET balance = balance + ? 
                WHERE id = 1
            `, [t.amount]);
            }

            // 5. Снимаем статус отмены
            await connection.execute(`
            UPDATE transactions 
            SET status = NULL 
            WHERE id = ?
        `, [transactionIdNum]);

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw new Error(`Ошибка при перепроведении транзакции: ${error.message}`);
        } finally {
            connection.release();
        }
    }

    static async updateTransaction(transactionId, updateData) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const transactionIdNum = parseInt(transactionId);

            // Проверяем, что транзакция существует и отменена
            const [transaction] = await connection.execute(`
            SELECT type, status FROM transactions WHERE id = ?
        `, [transactionIdNum]);

            if (transaction.length === 0) {
                throw new Error('Транзакция не найдена');
            }

            if (transaction[0].status !== 'cancelled') {
                throw new Error('Можно редактировать только отмененные транзакции');
            }

            // Обновляем данные транзакции
            const [result] = await connection.execute(`
            UPDATE transactions 
            SET description = ?, amount = ?
            WHERE id = ?
        `, [
                updateData.description,
                updateData.amount,
                transactionIdNum
            ]);

            await connection.commit();
            return result.affectedRows > 0;
        } catch (error) {
            await connection.rollback();
            throw new Error(`Ошибка при обновлении транзакции: ${error.message}`);
        } finally {
            connection.release();
        }
    }

}

module.exports = Transaction;
