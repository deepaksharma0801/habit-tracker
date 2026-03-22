const express = require('express');
const { getDB } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const pad = (n) => String(n).padStart(2, '0');

// Get all active habits
router.get('/', (req, res) => {
  const habits = getDB()
    .prepare('SELECT * FROM habits WHERE user_id = ? AND is_active = 1 ORDER BY sort_order, id')
    .all(req.userId);
  res.json(habits);
});

// Add habit
router.post('/', (req, res) => {
  const { name, category } = req.body || {};
  if (!name || !category) return res.status(400).json({ error: 'Name and category required' });
  const db = getDB();
  const { m } = db.prepare('SELECT MAX(sort_order) as m FROM habits WHERE user_id = ?').get(req.userId);
  const { lastInsertRowid } = db
    .prepare('INSERT INTO habits (user_id, name, category, sort_order) VALUES (?, ?, ?, ?)')
    .run(req.userId, name.trim(), category, (m || 0) + 1);
  res.json(db.prepare('SELECT * FROM habits WHERE id = ?').get(lastInsertRowid));
});

// Update habit
router.put('/:id', (req, res) => {
  const db = getDB();
  const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!habit) return res.status(404).json({ error: 'Not found' });
  const { name = habit.name, category = habit.category } = req.body || {};
  db.prepare('UPDATE habits SET name = ?, category = ? WHERE id = ?').run(name.trim(), category, req.params.id);
  res.json(db.prepare('SELECT * FROM habits WHERE id = ?').get(req.params.id));
});

// Soft delete
router.delete('/:id', (req, res) => {
  const db = getDB();
  const habit = db.prepare('SELECT id FROM habits WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!habit) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE habits SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Get logs for year/month
router.get('/logs/:year/:month', (req, res) => {
  const { year, month } = req.params;
  const logs = getDB()
    .prepare(`
      SELECT hl.habit_id, hl.date, hl.completed
      FROM habit_logs hl
      JOIN habits h ON h.id = hl.habit_id
      WHERE hl.user_id = ? AND hl.date LIKE ? AND h.is_active = 1
    `)
    .all(req.userId, `${year}-${pad(month)}-%`);
  res.json(logs);
});

// Toggle log
router.post('/logs', (req, res) => {
  const { habit_id, date, completed } = req.body || {};
  if (!habit_id || !date) return res.status(400).json({ error: 'habit_id and date required' });
  const db = getDB();
  if (!db.prepare('SELECT id FROM habits WHERE id = ? AND user_id = ?').get(habit_id, req.userId)) {
    return res.status(404).json({ error: 'Habit not found' });
  }
  db.prepare('INSERT OR REPLACE INTO habit_logs (user_id, habit_id, date, completed) VALUES (?, ?, ?, ?)')
    .run(req.userId, habit_id, date, completed ? 1 : 0);
  res.json({ success: true, habit_id, date, completed: !!completed });
});

// Stats
router.get('/stats', (req, res) => {
  const db = getDB();
  const habits = db.prepare('SELECT * FROM habits WHERE user_id = ? AND is_active = 1 ORDER BY sort_order').all(req.userId);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const ninetyDaysAgo = new Date(Date.now() - 90 * 864e5).toISOString().split('T')[0];

  const logs = db
    .prepare('SELECT habit_id, date, completed FROM habit_logs WHERE user_id = ? AND date >= ? ORDER BY date')
    .all(req.userId, ninetyDaysAgo);

  const logMap = {};
  logs.forEach((l) => {
    if (!logMap[l.habit_id]) logMap[l.habit_id] = {};
    logMap[l.habit_id][l.date] = l.completed;
  });

  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const dayOfMonth = today.getDate();

  const habitsWithStats = habits.map((habit) => {
    const hLogs = logMap[habit.id] || {};

    let completedThisMonth = 0;
    for (let d = 1; d <= dayOfMonth; d++) {
      if (hLogs[`${year}-${pad(month)}-${pad(d)}`]) completedThisMonth++;
    }
    const completion_pct = dayOfMonth > 0 ? Math.round((completedThisMonth / dayOfMonth) * 100) : 0;

    let current_streak = 0;
    const checkD = new Date(today);
    if (!hLogs[todayStr]) checkD.setDate(checkD.getDate() - 1);
    while (true) {
      const ds = checkD.toISOString().split('T')[0];
      if (ds < ninetyDaysAgo) break;
      if (hLogs[ds]) { current_streak++; checkD.setDate(checkD.getDate() - 1); }
      else break;
    }

    const doneDates = Object.keys(hLogs).filter((d) => hLogs[d]).sort();
    let longest_streak = doneDates.length > 0 ? 1 : 0;
    let temp = doneDates.length > 0 ? 1 : 0;
    for (let i = 1; i < doneDates.length; i++) {
      const diff = (new Date(doneDates[i]) - new Date(doneDates[i - 1])) / 864e5;
      if (diff === 1) { temp++; longest_streak = Math.max(longest_streak, temp); }
      else temp = 1;
    }

    return { ...habit, completion_pct, completed_this_month: completedThisMonth, current_streak, longest_streak };
  });

  const avg_completion = habitsWithStats.length
    ? Math.round(habitsWithStats.reduce((s, h) => s + h.completion_pct, 0) / habitsWithStats.length)
    : 0;
  const habits_above_80 = habitsWithStats.filter((h) => h.completion_pct >= 80).length;
  const streakLeader = habitsWithStats.reduce(
    (best, h) => (h.current_streak > (best?.current_streak || 0) ? h : best),
    null
  );

  const catMap = {};
  habitsWithStats.forEach((h) => {
    if (!catMap[h.category]) catMap[h.category] = { total: 0, count: 0 };
    catMap[h.category].total += h.completion_pct;
    catMap[h.category].count++;
  });
  const categories = Object.entries(catMap).map(([name, d]) => ({
    name,
    avg_completion: Math.round(d.total / d.count),
  }));

  res.json({
    habits: habitsWithStats,
    overall: {
      avg_completion,
      habits_above_80,
      streak_leader: streakLeader ? { name: streakLeader.name, streak: streakLeader.current_streak } : null,
      total_habits: habitsWithStats.length,
    },
    categories,
  });
});

// Heatmap
router.get('/heatmap/:year/:month', (req, res) => {
  const { year, month } = req.params;
  const db = getDB();
  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  const totalHabits = db
    .prepare('SELECT COUNT(*) as c FROM habits WHERE user_id = ? AND is_active = 1')
    .get(req.userId).c;

  const heatmap = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${pad(month)}-${pad(d)}`;
    const { count } = db
      .prepare('SELECT COUNT(*) as count FROM habit_logs WHERE user_id = ? AND date = ? AND completed = 1')
      .get(req.userId, dateStr);
    heatmap.push({
      date: dateStr,
      day: d,
      completed: count,
      total: totalHabits,
      pct: totalHabits ? Math.round((count / totalHabits) * 100) : 0,
    });
  }
  res.json(heatmap);
});

module.exports = router;
