import { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';

const CAT_COLORS = {
  Health:   '#6BBF77',
  Learning: '#7AA5A9',
  Career:   '#5B8FB9',
  Finance:  '#D9A441',
  Mindset:  '#9575CD',
};

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export default function Tracker() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState({}); // habitId -> date -> completed
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // habitId-date being saved

  const todayStr = now.toISOString().split('T')[0];
  const daysInMonth = new Date(year, month, 0).getDate();

  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = (d) => `${year}-${pad(month)}-${pad(d)}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [h, l] = await Promise.all([api.getHabits(), api.getLogs(year, month)]);
      setHabits(h);
      const map = {};
      l.forEach((log) => {
        if (!map[log.habit_id]) map[log.habit_id] = {};
        map[log.habit_id][log.date] = log.completed;
      });
      setLogs(map);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  async function toggleLog(habitId, d) {
    const ds = dateStr(d);
    if (ds > todayStr) return; // no future dates
    const key = `${habitId}-${ds}`;
    const current = !!(logs[habitId]?.[ds]);
    const next = !current;

    // Optimistic update
    setLogs((prev) => ({
      ...prev,
      [habitId]: { ...prev[habitId], [ds]: next },
    }));
    setSaving(key);

    try {
      await api.setLog(habitId, ds, next);
    } catch {
      // Revert
      setLogs((prev) => ({
        ...prev,
        [habitId]: { ...prev[habitId], [ds]: current },
      }));
    } finally {
      setSaving(null);
    }
  }

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    const futureYear = month === 12 ? year + 1 : year;
    const futureMonth = month === 12 ? 1 : month + 1;
    const futureDate = `${futureYear}-${pad(futureMonth)}-01`;
    if (futureDate > todayStr) return; // don't navigate beyond current month
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  // Compute stats per habit
  function getHabitStats(habit) {
    const hLogs = logs[habit.id] || {};
    const today = new Date();
    const dayOfMonth = isCurrentMonth ? today.getDate() : daysInMonth;

    let completed = 0;
    for (let d = 1; d <= dayOfMonth; d++) {
      if (hLogs[dateStr(d)]) completed++;
    }
    const pct = dayOfMonth > 0 ? Math.round((completed / dayOfMonth) * 100) : 0;

    // Current streak (looking back from today/end of month)
    let streak = 0;
    const startDay = isCurrentMonth ? today.getDate() : daysInMonth;
    let checkDay = startDay;
    // If today not completed, start from yesterday
    if (isCurrentMonth && !hLogs[dateStr(startDay)]) checkDay--;
    while (checkDay >= 1) {
      if (hLogs[dateStr(checkDay)]) { streak++; checkDay--; }
      else break;
    }

    return { pct, streak };
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <div className="loading-text">Loading tracker…</div>
      </div>
    );
  }

  // Day headers
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div>
      <div className="page-header">
        <h1>Monthly Tracker</h1>
        <p>Click any cell to mark a habit as done or undone</p>
      </div>

      <div className="tracker-controls">
        <div className="month-nav">
          <button className="month-nav-btn" onClick={prevMonth}>‹</button>
          <span className="month-label">{MONTHS[month - 1]} {year}</span>
          <button className="month-nav-btn" onClick={nextMonth} disabled={isCurrentMonth} style={{ opacity: isCurrentMonth ? 0.3 : 1 }}>›</button>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginLeft: 'auto' }}>
          {Object.entries(CAT_COLORS).map(([cat, color]) => (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-mid)' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
              {cat}
            </div>
          ))}
        </div>
      </div>

      {habits.length === 0 ? (
        <div className="card card-pad">
          <div className="empty-state">
            <div className="empty-state-icon">✏️</div>
            <h3>No habits yet</h3>
            <p>Add habits in the Manage Habits section</p>
          </div>
        </div>
      ) : (
        <div className="tracker-table-wrap">
          <table className="tracker-table">
            <thead>
              <tr>
                <th className="habit-col">Habit</th>
                {days.map((d) => {
                  const ds = dateStr(d);
                  const isToday = ds === todayStr;
                  const dow = new Date(year, month - 1, d).toLocaleDateString('en', { weekday: 'short' })[0];
                  return (
                    <th key={d} className={isToday ? 'today-col' : ''}>
                      <div>{d}</div>
                      <div style={{ fontSize: 9, opacity: 0.7 }}>{dow}</div>
                    </th>
                  );
                })}
                <th style={{ borderLeft: '1px solid var(--border)' }}>%</th>
                <th>Streak</th>
              </tr>
            </thead>
            <tbody>
              {habits.map((habit) => {
                const color = CAT_COLORS[habit.category] || '#888';
                const { pct, streak } = getHabitStats(habit);
                const pctClass = pct >= 80 ? 'pct-high' : pct >= 40 ? 'pct-mid' : 'pct-low';

                return (
                  <tr key={habit.id}>
                    <td className="habit-name-cell">
                      <div className="habit-name-cell-inner">
                        <div className="habit-cat-dot" style={{ background: color }} />
                        <span className="habit-row-name">{habit.name}</span>
                      </div>
                    </td>
                    {days.map((d) => {
                      const ds = dateStr(d);
                      const isFuture = ds > todayStr;
                      const done = !!(logs[habit.id]?.[ds]);
                      const isToday = ds === todayStr;
                      const key = `${habit.id}-${ds}`;
                      const isSaving = saving === key;

                      return (
                        <td key={d} className={`day-cell ${isToday ? 'today-day' : ''}`}>
                          <button
                            className={`check-btn ${done ? 'done' : ''} ${isFuture ? 'future' : ''}`}
                            onClick={() => toggleLog(habit.id, d)}
                            disabled={isFuture || isSaving}
                            title={isFuture ? 'Future date' : ds}
                            style={isSaving ? { opacity: 0.5 } : {}}
                          >
                            {done ? '✓' : ''}
                          </button>
                        </td>
                      );
                    })}
                    <td className="stat-cell">
                      <span className={`pct-badge ${pctClass}`}>{pct}%</span>
                    </td>
                    <td className="stat-cell">
                      <span className="streak-badge">
                        🔥 {streak}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
