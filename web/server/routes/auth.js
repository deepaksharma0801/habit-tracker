const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB, seedDefaultHabits } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
const SECRET = () => process.env.JWT_SECRET || 'habit-tracker-super-secret-key-change-in-production';

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const db = getDB();
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase())) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hash = await bcrypt.hash(password, 10);
    const { lastInsertRowid: userId } = db
      .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run(name.trim(), email.toLowerCase(), hash);
    seedDefaultHabits(userId);
    const token = jwt.sign({ userId }, SECRET(), { expiresIn: '30d' });
    res.json({ token, user: { id: userId, name: name.trim(), email: email.toLowerCase() } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const db = getDB();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user.id }, SECRET(), { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', auth, (req, res) => {
  const user = getDB().prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

module.exports = router;
