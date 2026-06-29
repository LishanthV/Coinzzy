const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'coinzy_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
});

async function runMigrations() {
  const conn = await pool.getConnection();
  try {
    // ── users ────────────────────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id           VARCHAR(36)  PRIMARY KEY,
        name         VARCHAR(255) NOT NULL,
        email        VARCHAR(255) NOT NULL UNIQUE,
        password     VARCHAR(255) NOT NULL,
        created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_users_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // ── pending_registrations ────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS pending_registrations (
        id         VARCHAR(36)  PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        email      VARCHAR(255) NOT NULL UNIQUE,
        password   VARCHAR(255) NOT NULL,
        otp        VARCHAR(6)   NOT NULL,
        otp_attempts  TINYINT  DEFAULT 0,
        resend_count  TINYINT  DEFAULT 0,
        last_resend   DATETIME NULL,
        expires_at DATETIME     NOT NULL,
        INDEX idx_pending_email (email),
        INDEX idx_pending_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Add resend throttle columns if they don't exist (for existing DBs)
    try {
      await conn.query(`ALTER TABLE pending_registrations ADD COLUMN otp_attempts TINYINT DEFAULT 0`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE pending_registrations ADD COLUMN resend_count TINYINT DEFAULT 0`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE pending_registrations ADD COLUMN last_resend DATETIME NULL`);
    } catch (_) {}

    // ── refresh_tokens ───────────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id         VARCHAR(36) PRIMARY KEY,
        userId     VARCHAR(36) NOT NULL,
        token      TEXT        NOT NULL,
        expires_at DATETIME    NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_rt_userId (userId),
        INDEX idx_rt_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // ── accounts ─────────────────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id        VARCHAR(36)    PRIMARY KEY,
        userId    VARCHAR(36)    NOT NULL,
        name      VARCHAR(255)   NOT NULL,
        type      VARCHAR(50)    NOT NULL,
        balance   DECIMAL(15,2)  NOT NULL DEFAULT 0,
        color     VARCHAR(50)    NOT NULL DEFAULT '#6366f1',
        icon      VARCHAR(50)    NOT NULL DEFAULT 'wallet',
        currency  VARCHAR(3)     NOT NULL DEFAULT 'INR',
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_accounts_userId (userId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // ── transactions ─────────────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id             VARCHAR(36)   PRIMARY KEY,
        userId         VARCHAR(36)   NOT NULL,
        accountId      VARCHAR(36)   NOT NULL,
        toAccountId    VARCHAR(36)   NULL,
        type           VARCHAR(20)   NOT NULL,
        amount         DECIMAL(15,2) NOT NULL,
        categoryId     VARCHAR(50)   NULL,
        note           TEXT          NULL,
        date           DATE          NOT NULL,
        merchant       VARCHAR(255)  NULL,
        customCategory VARCHAR(255)  NULL,
        items          TEXT          NULL,
        deleted_at     DATETIME      NULL,
        created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId)    REFERENCES users(id)    ON DELETE CASCADE,
        FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE,
        INDEX idx_txn_userId   (userId),
        INDEX idx_txn_date     (date),
        INDEX idx_txn_deleted  (deleted_at),
        INDEX idx_txn_category (categoryId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Add deleted_at for soft deletes if not exists
    try {
      await conn.query(`ALTER TABLE transactions ADD COLUMN deleted_at DATETIME NULL`);
      await conn.query(`ALTER TABLE transactions ADD INDEX idx_txn_deleted (deleted_at)`);
    } catch (_) {}

    // ── budgets ──────────────────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id         VARCHAR(36)   PRIMARY KEY,
        userId     VARCHAR(36)   NOT NULL,
        categoryId VARCHAR(50)   NOT NULL,
        \`limit\`  DECIMAL(15,2) NOT NULL,
        period     VARCHAR(20)   NOT NULL DEFAULT 'monthly',
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uq_budget_user_cat (userId, categoryId),
        INDEX idx_budgets_userId (userId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // ── savings_goals ────────────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS savings_goals (
        id            VARCHAR(36)   PRIMARY KEY,
        userId        VARCHAR(36)   NOT NULL,
        name          VARCHAR(255)  NOT NULL,
        targetAmount  DECIMAL(15,2) NOT NULL,
        currentAmount DECIMAL(15,2) NOT NULL DEFAULT 0,
        targetDate    DATE          NULL,
        updatedAt     BIGINT        NOT NULL DEFAULT 0,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_goals_userId (userId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // ── recurring_transactions ───────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id            VARCHAR(36)   PRIMARY KEY,
        userId        VARCHAR(36)   NOT NULL,
        accountId     VARCHAR(36)   NOT NULL,
        type          VARCHAR(20)   NOT NULL,
        amount        DECIMAL(15,2) NOT NULL,
        categoryId    VARCHAR(50)   NULL,
        note          VARCHAR(255)  NULL,
        merchant      VARCHAR(255)  NULL,
        frequency     VARCHAR(20)   NOT NULL,
        nextDueDate   DATE          NOT NULL,
        lastProcessed DATE          NULL,
        isActive      TINYINT(1)    NOT NULL DEFAULT 1,
        updatedAt     BIGINT        NOT NULL DEFAULT 0,
        FOREIGN KEY (userId)    REFERENCES users(id)    ON DELETE CASCADE,
        FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE,
        INDEX idx_recurring_userId  (userId),
        INDEX idx_recurring_due     (nextDueDate),
        INDEX idx_recurring_active  (isActive)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // ── error_logs ──────────────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS error_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        level VARCHAR(10) NOT NULL DEFAULT 'ERROR',
        message TEXT NOT NULL,
        stack TEXT,
        screen VARCHAR(100),
        user_id INT,
        app_version VARCHAR(20),
        platform VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_level (level),
        INDEX idx_user (user_id),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('✅ Migrations complete');
  } finally {
    conn.release();
  }
}

module.exports = { pool, runMigrations };
