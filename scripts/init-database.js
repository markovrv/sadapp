const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function initDatabase() {
    let connection;
    
    try {
        // Создаем подключение к MySQL без указания базы данных
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3306
        });

        console.log('Подключение к MySQL установлено');

        // Читаем SQL схему
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schema = await fs.readFile(schemaPath, 'utf8');

        // Выполняем SQL команды
        const commands = schema.split(';').filter(cmd => cmd.trim());
        
        for (const command of commands) {
            if (command.trim()) {
                await connection.execute(command);
                console.log('Выполнена команда:', command.substring(0, 50) + '...');
            }
        }

        console.log('База данных успешно инициализирована!');
        
        // Создаем тестовые данные
        await createTestData(connection);
        
    } catch (error) {
        console.error('Ошибка при инициализации базы данных:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

async function createTestData(connection) {
    try {
        // Добавляем тестовых участников
        const participants = [
            ['Иван', 'Иванов', '+7-999-123-45-67', 'ivan@example.com', 'Маша Иванова'],
            ['Петр', 'Петров', '+7-999-234-56-78', 'petr@example.com', 'Саша Петров'],
            ['Анна', 'Сидорова', '+7-999-345-67-89', 'anna@example.com', 'Даша Сидорова'],
            ['Мария', 'Козлова', '+7-999-456-78-90', 'maria@example.com', 'Миша Козлов']
        ];

        for (const participant of participants) {
            await connection.execute(
                'INSERT INTO participants (first_name, last_name, phone, email, child_name) VALUES (?, ?, ?, ?, ?)',
                participant
            );
        }

        // Создаем лицевые счета для участников
        await connection.execute(`
            INSERT INTO personal_accounts (participant_id, balance)
            SELECT id, 0.00 FROM participants
        `);

        console.log('Тестовые данные созданы');
        
    } catch (error) {
        console.error('Ошибка при создании тестовых данных:', error);
    }
}

// Запускаем инициализацию
initDatabase();

