CREATE DATABASE IF NOT EXISTS kindergarten_payments;
USE kindergarten_payments;

CREATE TABLE participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    child_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Таблица лицевых счетов участников
CREATE TABLE personal_accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    participant_id INT NOT NULL,
    balance DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
);

-- Таблица общего счета группы
CREATE TABLE group_account (
    id INT PRIMARY KEY AUTO_INCREMENT,
    balance DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Таблица операций (взносы, расходы, переводы)
CREATE TABLE transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type ENUM('contribution', 'expense', 'transfer', 'distribution') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    participant_id INT,
    group_account_id INT DEFAULT 1,
    personal_account_id INT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE SET NULL,
    FOREIGN KEY (group_account_id) REFERENCES group_account(id),
    FOREIGN KEY (personal_account_id) REFERENCES personal_accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES participants(id) ON DELETE SET NULL
);

-- Таблица распределения расходов
CREATE TABLE expense_distributions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_id INT NOT NULL,
    participant_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    personal_account_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
    FOREIGN KEY (personal_account_id) REFERENCES personal_accounts(id) ON DELETE CASCADE
);

-- Создание начального общего счета
INSERT INTO group_account (balance) VALUES (0.00);

-- Индексы для оптимизации запросов
CREATE INDEX idx_transactions_participant ON transactions(participant_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_personal_accounts_participant ON personal_accounts(participant_id);
CREATE INDEX idx_expense_distributions_transaction ON expense_distributions(transaction_id);
CREATE INDEX idx_expense_distributions_participant ON expense_distributions(participant_id);

ALTER TABLE transactions 
ADD COLUMN status ENUM('cancelled') NULL DEFAULT NULL;

