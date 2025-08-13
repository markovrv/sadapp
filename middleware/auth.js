const jwt = require('jsonwebtoken');
const db = require('../config/database');
require('dotenv').config();

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ success: false, error: 'Требуется авторизация' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Неверный токен авторизации' });
    }
};

const checkAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }
    next();
};

const login = async (req, res) => {
    const { login, password } = req.body;

    try {
        // Проверка администратора
        if (login === process.env.ADMIN_LOGIN && password === process.env.ADMIN_PASSWORD) {
            const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET || 'your_secret_key', { expiresIn: '8h' });
            return res.json({ success: true, token, role: 'admin' });
        }

        // Проверка родителя (по телефону и имени ребенка)
        const [participants] = await db.execute(`
            SELECT * FROM participants 
            WHERE phone = ? AND child_name = ?
        `, [login, password]);

        if (participants.length > 0) {
            const token = jwt.sign({ 
                role: 'parent', 
                participantId: participants[0].id 
            }, process.env.JWT_SECRET || 'your_secret_key', { expiresIn: '8h' });
            
            return res.json({ success: true, token, role: 'parent' });
        }

        return res.status(401).json({ success: false, error: 'Неверные учетные данные' });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = { authenticate, checkAdmin, login };