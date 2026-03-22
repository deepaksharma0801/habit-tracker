const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'habits.db');

let db;

function getDB() {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
  }
  return db;
}

const DEFAULT_HABITS = [
  { name: 'Morning Exercise', category: 'Health' },
  { name: 'Hydration (8 glasses)', category: 'Health' },
  { name: 'Sleep by 10pm', category: 'Health' },
  { name: 'No Junk Food', category: 'Health' },
  { name: '10,000 Steps', category: 'Health' },
  { name: 'Cook at Home', category: 'Health' },
  { name: 'Read 30 min', category: 'Learning' },
  { name: 'Journal', category: 'Learning' },
  { name: 'Learn Language', category: 'Learning' },
  { name: 'Gratitude List', category: 'Learning' },
  { name: 'Practice Skill', category: 'Learning' },
  { name: 'Creative Work', category: 'Learning' },
  { name: 'Learning Module', category: 'Learning' },
  { name: 'Deep Work Block', category: 'Career' },
  { name: 'Review Goals', category: 'Career' },
  { name: 'No Social Media', category: 'Career' },
  { name: 'Networking', category: 'Career' },
  { name: 'Side Project', category: 'Career' },
  { name: 'Read News', category: 'Career' },
  { name: 'Email Zero', category: 'Career' },
  { name: 'Plan Tomorrow', category: 'Career' },
  { name: 'Weekly Review', category: 'Career' },
  { name: 'Portfolio Update', category: 'Career' },
  { name: 'Savings Transfer', category: 'Finance' },
  { name: 'Track Spending', category: 'Finance' },
  { name: 'No Impulse Buys', category: 'Finance' },
  { name: 'Affirmations', category: 'Mindset' },
  { name: 'Outdoor Time', category: 'Mindset' },
  { name: 'Digital Detox', category: 'Mindset' },
  { name: 'Meditation 10 min', category: 'Mindset' },
];

function initDB() {
  const d = getDB();
  d.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      habit_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
      UNIQUE(habit_id, date)
    );
  `);
  console.log('Database ready');
}

function seedDefaultHabits(userId) {
  const d = getDB();
  const stmt = d.prepare('INSERT INTO habits (user_id, name, category, sort_order) VALUES (?, ?, ?, ?)');
  DEFAULT_HABITS.forEach((h, i) => stmt.run(userId, h.name, h.category, i));
}

module.exports = { getDB, initDB, seedDefaultHabits };
