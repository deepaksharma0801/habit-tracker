require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
const authRoutes = require('./routes/auth');
const habitsRoutes = require('./routes/habits');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

initDB();

app.use('/api/auth', authRoutes);
app.use('/api/habits', habitsRoutes);
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Habit Tracker server running on http://localhost:${PORT}`);
});
