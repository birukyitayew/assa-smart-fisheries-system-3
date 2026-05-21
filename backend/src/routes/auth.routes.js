const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database/db');
const authMiddleware = require('../middleware/auth.middleware');

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      req.log?.error('JWT_SECRET is not configured');
      return res.status(500).json({ error: 'Server authentication is not configured' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
    );

    let profile = null;
    if (user.role === 'fisher') {
      profile = db.prepare(`
        SELECT f.*, u.name, fz.name as zone_name, fz.type as zone_type,
               b.boat_name, b.registration_number
        FROM fishers f
        JOIN users u ON f.user_id = u.id
        LEFT JOIN fishing_zones fz ON f.zone_id = fz.id
        LEFT JOIN boats b ON b.fisher_id = f.id
        WHERE f.user_id = ?
        LIMIT 1
      `).get(user.id);
    }

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone },
      profile,
    });
  } catch (err) {
    req.log?.error({ err }, 'Login failed');
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  // JWT is stateless; client discards the token
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  let profile = null;
  if (user.role === 'fisher') {
    profile = db.prepare(`
      SELECT f.*, fz.name as zone_name, fz.type as zone_type,
             b.boat_name, b.registration_number, b.capacity_kg
      FROM fishers f
      LEFT JOIN fishing_zones fz ON f.zone_id = fz.id
      LEFT JOIN boats b ON b.fisher_id = f.id
      WHERE f.user_id = ?
    `).get(user.id);
  }

  res.json({ user, profile });
});

module.exports = router;
