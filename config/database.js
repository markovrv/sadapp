const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'kindergarten_payments',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
};

// Создаем пул соединений
const pool = mysql.createPool(dbConfig);

// Тестируем подключение
pool.getConnection()
    .then(connection => {
        console.log('База данных подключена успешно');
        connection.release();
    })
    .catch(err => {
        console.error('Ошибка подключения к базе данных:', err);
    });

module.exports = pool;

