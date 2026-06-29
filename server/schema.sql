-- Database initialization script for Coinzy

CREATE DATABASE IF NOT EXISTS coinzy_db;
USE coinzy_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    color VARCHAR(50) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    updatedAt BIGINT NOT NULL DEFAULT 0,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Budgets Table
CREATE TABLE IF NOT EXISTS budgets (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    categoryId VARCHAR(50) NOT NULL,
    `limit` DECIMAL(15, 2) NOT NULL,
    period VARCHAR(20) DEFAULT 'monthly',
    updatedAt BIGINT NOT NULL DEFAULT 0,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    accountId VARCHAR(36) NOT NULL,
    toAccountId VARCHAR(36) DEFAULT NULL,
    type VARCHAR(20) NOT NULL, -- 'income', 'expense', 'transfer'
    amount DECIMAL(15, 2) NOT NULL,
    categoryId VARCHAR(50) DEFAULT NULL, -- Nullable for transfers
    note TEXT,
    date VARCHAR(50) NOT NULL,
    merchant VARCHAR(255) DEFAULT NULL,  -- For scanned receipts
    customCategory VARCHAR(255) DEFAULT NULL,
    updatedAt BIGINT NOT NULL DEFAULT 0,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
);

-- 5. Transaction Items Table (Normalized receipt lines)
CREATE TABLE IF NOT EXISTS transaction_items (
    id VARCHAR(36) PRIMARY KEY,
    transactionId VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(15, 2) NOT NULL,
    quantity INT DEFAULT 1,
    FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE
);

-- 6. Refresh Tokens Table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    token VARCHAR(512) UNIQUE NOT NULL,
    expiresAt DATETIME NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Invalidated Stateless Tokens (Blocklist)
CREATE TABLE IF NOT EXISTS invalid_tokens (
    token VARCHAR(512) PRIMARY KEY,
    invalidatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Savings Goals Table
CREATE TABLE IF NOT EXISTS savings_goals (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    targetAmount DECIMAL(15, 2) NOT NULL,
    currentAmount DECIMAL(15, 2) DEFAULT 0.00,
    targetDate VARCHAR(50) DEFAULT NULL,
    updatedAt BIGINT NOT NULL DEFAULT 0,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

