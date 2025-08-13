const express = require('express');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const router = express.Router();
const { checkAdmin } = require('../middleware/auth');

// Валидация данных транзакции
const validateContribution = [
    body('participant_id').isInt({ min: 1 }).withMessage('ID участника должен быть положительным числом'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Сумма должна быть больше 0'),
    body('description').trim().isLength({ min: 3, max: 500 }).withMessage('Описание должно содержать от 3 до 500 символов')
];

const validateExpense = [
    body('amount').isFloat({ min: 0.01 }).withMessage('Сумма должна быть больше 0'),
    body('description').trim().isLength({ min: 3, max: 500 }).withMessage('Описание должно содержать от 3 до 500 символов')
];

// GET /api/transactions - Получить все транзакции
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        
        const transactions = await Transaction.getAll(limit, offset);
        res.json({
            success: true,
            data: transactions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/transactions/participant/:id - Получить транзакции участника
router.get('/participant/:id', async (req, res) => {
    try {
        const participantId = parseInt(req.params.id);
        if (isNaN(participantId)) {
            return res.status(400).json({
                success: false,
                error: 'Неверный ID участника'
            });
        }

        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        
        const transactions = await Transaction.getByParticipant(participantId, limit, offset);
        res.json({
            success: true,
            data: transactions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/transactions/contribution - Создать взнос
router.post('/contribution', checkAdmin, validateContribution, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { participant_id, amount, description } = req.body;
        const createdBy = req.body.created_by || participant_id; // По умолчанию создатель = участник

        const transactionId = await Transaction.createContribution(
            participant_id, 
            amount, 
            description, 
            createdBy
        );

        res.status(201).json({
            success: true,
            data: { transaction_id: transactionId },
            message: 'Взнос успешно создан'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/transactions/expense - Создать расход
router.post('/expense', checkAdmin, validateExpense, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { amount, description } = req.body;
        const createdBy = req.body.created_by || 1; // По умолчанию создатель = администратор

        const transactionId = await Transaction.createExpense(
            amount, 
            description, 
            createdBy
        );

        res.status(201).json({
            success: true,
            data: { transaction_id: transactionId },
            message: 'Расход успешно создан и распределен между участниками'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/transactions/statistics - Получить статистику
router.get('/statistics', async (req, res) => {
    try {
        const statistics = await Transaction.getStatistics();
        res.json({
            success: true,
            data: statistics
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/transactions/:id/distribution - Получить распределение расходов
router.get('/:id/distribution', async (req, res) => {
    try {
        const transactionId = parseInt(req.params.id);
        if (isNaN(transactionId)) {
            return res.status(400).json({
                success: false,
                error: 'Неверный ID транзакции'
            });
        }

        const distribution = await Transaction.getExpenseDistribution(transactionId);
        res.json({
            success: true,
            data: distribution
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/transactions/:id/cancel - Отменить транзакцию
router.post('/:id/cancel', checkAdmin, async (req, res) => {
    try {
        const transactionId = parseInt(req.params.id);
        if (isNaN(transactionId)) {
            return res.status(400).json({
                success: false,
                error: 'Неверный ID транзакции'
            });
        }

        const success = await Transaction.cancelTransaction(transactionId);
        res.json({
            success: true,
            message: 'Транзакция успешно отменена'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/transactions/:id/reapply - Перепровести транзакцию
router.post('/:id/reapply', checkAdmin, async (req, res) => {
    try {
        const transactionId = parseInt(req.params.id);
        if (isNaN(transactionId)) {
            return res.status(400).json({
                success: false,
                error: 'Неверный ID транзакции'
            });
        }

        const success = await Transaction.reapplyTransaction(transactionId);
        res.json({
            success: true,
            message: 'Транзакция успешно перепроведена'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// DELETE /api/transactions/:id - Удалить транзакцию (только индивидуальные взносы)
router.delete('/:id', checkAdmin, async (req, res) => {
    try {
        const transactionId = parseInt(req.params.id);
        if (isNaN(transactionId)) {
            return res.status(400).json({
                success: false,
                error: 'Неверный ID транзакции'
            });
        }

        const success = await Transaction.deleteTransaction(transactionId);
        res.json({
            success: true,
            message: 'Транзакция успешно удалена'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Валидация данных для обновления транзакции
const validateTransactionUpdate = [
    body('description').trim().isLength({ min: 3, max: 500 }).withMessage('Описание должно содержать от 3 до 500 символов'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Сумма должна быть больше 0')
];

// PUT /api/transactions/:id - Обновить отмененную транзакцию
router.put('/:id', checkAdmin, validateTransactionUpdate, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const transactionId = parseInt(req.params.id);
        if (isNaN(transactionId)) {
            return res.status(400).json({
                success: false,
                error: 'Неверный ID транзакции'
            });
        }

        const { description, amount } = req.body;

        const updated = await Transaction.updateTransaction(transactionId, {
            description,
            amount
        });

        if (!updated) {
            return res.status(404).json({
                success: false,
                error: 'Транзакция не найдена или не может быть отредактирована'
            });
        }

        res.json({
            success: true,
            message: 'Транзакция успешно обновлена'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
