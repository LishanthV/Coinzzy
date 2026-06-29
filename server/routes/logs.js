const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.post('/', async (req, res) => {
  const { level = 'ERROR', message, stack, screen, userId, appVersion, platform } = req.body;

  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    await pool.query(
      `INSERT INTO error_logs (level, message, stack, screen, user_id, app_version, platform)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [level, message, stack || null, screen || null, userId || null, appVersion || null, platform || null]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to store log:', err.message);
    res.status(500).json({ error: 'Failed to store log' });
  }
});

// GET errors — filter by level, screen, userId
router.get('/', async (req, res) => {
  const { level, screen, userId, limit = 50, page = 1 } = req.query;
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (level)  { conditions.push('level = ?');   params.push(level); }
  if (screen) { conditions.push('screen = ?');  params.push(screen); }
  if (userId) { conditions.push('user_id = ?'); params.push(userId); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  
  try {
    const [rows] = await pool.query(
      `SELECT * FROM error_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    res.json(rows);
  } catch (err) {
    console.error('Failed to retrieve logs:', err.message);
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

module.exports = router;
