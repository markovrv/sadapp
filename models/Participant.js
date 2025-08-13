const db = require('../config/database');

class Participant {
    // Получить всех участников
    static async getAll() {
        try {
            const [rows] = await db.execute(`
                SELECT p.*, pa.balance as account_balance
                FROM participants p
                LEFT JOIN personal_accounts pa ON p.id = pa.participant_id
                ORDER BY p.last_name, p.first_name
            `);
            return rows;
        } catch (error) {
            throw new Error(`Ошибка при получении участников: ${error.message}`);
        }
    }

    // Получить участника по ID
    static async getById(id) {
        try {
            const idNum = parseInt(id);
            const [rows] = await db.execute(`
                SELECT p.*, pa.balance as account_balance
                FROM participants p
                LEFT JOIN personal_accounts pa ON p.id = pa.participant_id
                WHERE p.id = ?
            `, [idNum]);
            return rows[0];
        } catch (error) {
            throw new Error(`Ошибка при получении участника: ${error.message}`);
        }
    }

    // Создать нового участника
    static async create(participantData) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Создаем участника
            const [result] = await connection.execute(`
                INSERT INTO participants (first_name, last_name, phone, email, child_name)
                VALUES (?, ?, ?, ?, ?)
            `, [
                participantData.first_name,
                participantData.last_name,
                participantData.phone,
                participantData.email,
                participantData.child_name
            ]);

            const participantId = result.insertId;

            // Создаем лицевой счет
            await connection.execute(`
                INSERT INTO personal_accounts (participant_id, balance)
                VALUES (?, 0.00)
            `, [participantId]);

            await connection.commit();
            return participantId;
        } catch (error) {
            await connection.rollback();
            throw new Error(`Ошибка при создании участника: ${error.message}`);
        } finally {
            connection.release();
        }
    }

    // Обновить участника
    static async update(id, participantData) {
        try {
            const idNum = parseInt(id);
            const [result] = await db.execute(`
            UPDATE participants 
            SET first_name = ?, last_name = ?, phone = ?, email = ?, child_name = ?, is_excluded = ?
            WHERE id = ?
        `, [
                participantData.first_name,
                participantData.last_name,
                participantData.phone,
                participantData.email,
                participantData.child_name,
                (participantData.is_excluded || false)?1:0,
                idNum
            ]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Ошибка при обновлении участника: ${error.message}`);
        }
    }

    // Удалить участника
    static async delete(id) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const idNum = parseInt(id);

            // Проверяем, есть ли активные операции
            const [transactions] = await connection.execute(`
                SELECT COUNT(*) as count FROM transactions WHERE participant_id = ?
            `, [idNum]);

            if (transactions[0].count > 0) {
                throw new Error('Нельзя удалить участника с активными операциями');
            }

            // Удаляем участника (лицевой счет удалится каскадно)
            const [result] = await connection.execute(`
                DELETE FROM participants WHERE id = ?
            `, [idNum]);

            await connection.commit();
            return result.affectedRows > 0;
        } catch (error) {
            await connection.rollback();
            throw new Error(`Ошибка при удалении участника: ${error.message}`);
        } finally {
            connection.release();
        }
    }

    // Получить баланс участника
    static async getBalance(id) {
        try {
            const idNum = parseInt(id);
            const [rows] = await db.execute(`
                SELECT balance FROM personal_accounts WHERE participant_id = ?
            `, [idNum]);
            return rows[0] ? rows[0].balance : 0;
        } catch (error) {
            throw new Error(`Ошибка при получении баланса: ${error.message}`);
        }
    }
}

module.exports = Participant;
