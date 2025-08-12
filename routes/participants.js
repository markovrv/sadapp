const express = require('express');
const { body, validationResult } = require('express-validator');
const Participant = require('../models/Participant');
const router = express.Router();

// Валидация данных участника
const validateParticipant = [
    body('first_name').trim().isLength({ min: 2, max: 100 }).withMessage('Имя должно содержать от 2 до 100 символов'),
    body('last_name').trim().isLength({ min: 2, max: 100 }).withMessage('Фамилия должна содержать от 2 до 100 символов'),
    // body('phone').optional().isMobilePhone('ru-RU').withMessage('Неверный формат телефона'),
    // body('email').optional().isEmail().withMessage('Неверный формат email'),
    body('child_name').trim().isLength({ min: 2, max: 100 }).withMessage('Имя ребенка должно содержать от 2 до 100 символов')
];

// GET /api/participants - Получить всех участников
router.get('/', async (req, res) => {
    try {
        const participants = await Participant.getAll();
        res.json({
            success: true,
            data: participants
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/participants/:id - Получить участника по ID
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'Неверный ID участника'
            });
        }
        
        const participant = await Participant.getById(id);
        if (!participant) {
            return res.status(404).json({
                success: false,
                error: 'Участник не найден'
            });
        }
        res.json({
            success: true,
            data: participant
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/participants - Создать нового участника
router.post('/', validateParticipant, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const participantId = await Participant.create(req.body);
        const participant = await Participant.getById(participantId);
        
        res.status(201).json({
            success: true,
            data: participant,
            message: 'Участник успешно создан'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// PUT /api/participants/:id - Обновить участника
router.put('/:id', validateParticipant, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'Неверный ID участника'
            });
        }

        const updated = await Participant.update(id, req.body);
        if (!updated) {
            return res.status(404).json({
                success: false,
                error: 'Участник не найден'
            });
        }

        const participant = await Participant.getById(id);
        res.json({
            success: true,
            data: participant,
            message: 'Участник успешно обновлен'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// DELETE /api/participants/:id - Удалить участника
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'Неверный ID участника'
            });
        }

        const deleted = await Participant.delete(id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Участник не найден'
            });
        }

        res.json({
            success: true,
            message: 'Участник успешно удален'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/participants/:id/balance - Получить баланс участника
router.get('/:id/balance', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'Неверный ID участника'
            });
        }

        const balance = await Participant.getBalance(id);
        res.json({
            success: true,
            data: { balance }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
