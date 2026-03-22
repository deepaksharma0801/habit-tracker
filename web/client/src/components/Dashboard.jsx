import { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';

const CAT_COLORS = {
  Health:   { bg: '#6BBF77', pale: '#E8F5EE', text: '#2E7D57' },
  Learning: { bg: '#7AA5A9', pale: '#E3F1F2', text: '#3D7A7E' },
  Career:   { bg: '#5B8FB9', pale: '#E8F0F8', text: '#2E5F8A' },
  Finance:  { bg: '#D9A441', pale: '#FDF3E0', text: '#8B6914' },
  Mindset:  { bg: '#9575CD', pale: '#F0EBF8', text: '#5E35B1' },
};

function getHeatmapColor(pct) {
  if (pct === 0) return '#F0F7F4';
  if (pct < 25) return '#C8E6C9';
  if (pct < 50) return '#81C784';
  if (pct < 75) return '#4CAF50';
  if (pct < 90) return '#2E7D57';
  return '#1B5E20';
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [habits, setHabits] = useState([]);
  const [todayLogs, setTodayLogs] = useState({});
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const load = useCallback(async () => {
    try {
      const [s, hm, h, logs] = await Promise.all([
        api.getStats(),
        api.getHeatmap(year, month),
        api.getHabits(),
        api.getLogs(year, month),
      ]);
      setStats(s);
      setHeatmap(hm);
      setHabits(h);
      const map = {};
      logs.forEach((l) => {
        if (l.date === todayStr) map[l.habit_id] = l.completed;
      });
      setTodayLogs(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [year, month, todayStr]);

  useEffect(() => { load(); }, [load]);

  async function toggleToday(habit) {
    const current = !!todayLogs[habit.id];
    const next = !current;
    setTodayLogs((prev) => ({ ...prev, [habit.id]: next }));
    try {
      await api.setLog(habit.id, todayStr, next);
      // refresh stats silently
      api.getStats().then(setStats).catch(() => {});
    } catch {
      setTodayLogs((prev) => ({ ...prev, [habit.id]: current }));
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <div className="loading-text">Loading your dashboard…</div>
      </div>
    );
  }

  const { overall, categories } = stats || { overall: {}, categories: [] };

  const todayDone = habits.filter((h) => todayLogs[h.id]).length;
  const todayPct = habits.length > 0 ? Math.round((todayDone / habits.length) * 100) : 0;

  // For heatmap: pad to start of week
  const firstDay = new Date(year, month - 1, 1).getDay();
  const heatmapPadded = [...Array(firstDay).fill(null), ...heatmap];

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  return (
    <div>
      <div className="page-header">
        <h1>{getGreeting()}, {user.name.split(' ')[0]} 👋</h1>
        <p>
          {MONTH_NAMES[month - 1]} {today.getDate()}, {year} &mdash; you've completed {todayDone}/{habits.length} habits today
        </p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card green">
          <div className="kpi-icon green">🎯</div>
          <div className="kpi-value">{overall.total_habits ?? 0}</div>
          <div className="kpi-label">Active Habits</div>
        </div>
        <div className="kpi-card teal">
          <div className="kpi-icon teal">📈</div>
          <div className="kpi-value">{overall.avg_completion ?? 0}%</div>
          <div className="kpi-label">Avg Completion</div>
          <div className="kpi-sub">This month</div>
        </div>
        <div className="kpi-card amber">
          <div className="kpi-icon amber">⭐</div>
          <div className="kpi-value">{overall.habits_above_80 ?? 0}</div>
          <div className="kpi-label">Habits &gt; 80%</div>
          <div className="kpi-sub">Consistency wins</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon purple">🔥</div>
          <div className="kpi-value">{overall.streak_leader?.streak ?? 0}</div>
          <div className="kpi-label">Streak Leader</div>
          <div className="kpi-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {overall.streak_leader?.name ?? 'No streaks yet'}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Category Performance */}
          <div className="card card-pad">
            <div className="section-title">Category Performance</div>
            {categories.length === 0 ? (
              <div className="empty-state"><p>No data yet</p></div>
            ) : (
              categories.map((cat) => {
                const c = CAT_COLORS[cat.name] || { bg: '#888', pale: '#eee', text: '#444' };
                return (
                  <div key={cat.name} className="cat-bar-row">
                    <div className="cat-bar-label">{cat.name}</div>
                    <div className="cat-bar-track">
                      <div
                        className="cat-bar-fill"
                        style={{ width: `${cat.avg_completion}%`, background: c.bg }}
                      />
                    </div>
                    <div className="cat-bar-pct">{cat.avg_completion}%</div>
                  </div>
                );
              })
            )}
          </div>

          {/* Monthly Heatmap */}
          <div className="card card-pad">
            <div className="section-title">
              Monthly Heatmap
              <span style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 400 }}>
                % habits completed per day
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                <div key={d} style={{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-light)' }}>{d}</div>
              ))}
            </div>
            <div className="heatmap-grid">
              {heatmapPadded.map((cell, i) => {
                if (!cell) return <div key={`pad-${i}`} />;
                const isFuture = cell.date > todayStr;
                const isToday = cell.date === todayStr;
                return (
                  <div
                    key={cell.date}
                    className={`heatmap-day ${isFuture ? 'future' : ''}`}
                    style={{
                      background: isFuture ? 'var(--bg)' : getHeatmapColor(cell.pct),
                      border: isToday ? '2px solid var(--green-dark)' : '2px solid transparent',
                      color: cell.pct > 60 && !isFuture ? 'white' : 'var(--text-light)',
                    }}
                    title={`${cell.date}: ${cell.completed}/${cell.total} habits (${cell.pct}%)`}
                  >
                    {cell.day}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 12, justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 11, color: 'var(--text-light)' }}>Less</span>
              {[0, 25, 50, 75, 100].map((p) => (
                <div key={p} style={{ width: 14, height: 14, borderRadius: 3, background: getHeatmapColor(p) }} />
              ))}
              <span style={{ fontSize: 11, color: 'var(--text-light)' }}>More</span>
            </div>
          </div>
        </div>

        {/* Right column: Today's Check-In */}
        <div>
          <div className="card card-pad" style={{ position: 'sticky', top: 24 }}>
            <div className="section-title">
              Today's Check-In
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green-dark)' }}>
                {todayDone}/{habits.length}
              </span>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: 16 }}>
              <div className="cat-bar-track" style={{ height: 10 }}>
                <div
                  className="cat-bar-fill"
                  style={{ width: `${todayPct}%`, background: 'linear-gradient(90deg, var(--green-dark), var(--green-light))' }}
                />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 6 }}>{todayPct}% complete</div>
            </div>

            <div className="today-list">
              {habits.map((h) => {
                const c = CAT_COLORS[h.category] || { bg: '#888', pale: '#eee', text: '#444' };
                const done = !!todayLogs[h.id];
                return (
                  <div
                    key={h.id}
                    className={`today-item ${done ? 'done' : ''}`}
                    onClick={() => toggleToday(h)}
                  >
                    <div className="today-check">{done ? '✓' : ''}</div>
                    <div className="today-habit-name">{h.name}</div>
                    <span className="cat-pill" style={{ background: c.pale, color: c.text }}>
                      {h.category}
                    </span>
                  </div>
                );
              })}
              {habits.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">✏️</div>
                  <h3>No habits yet</h3>
                  <p>Go to Manage Habits to add some</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
