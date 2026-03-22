import { useState, useEffect } from 'react';
import { api } from '../api.js';

const CATEGORIES = ['Health', 'Learning', 'Career', 'Finance', 'Mindset'];

const CAT_COLORS = {
  Health:   { bg: '#6BBF77', pale: '#E8F5EE', text: '#2E7D57' },
  Learning: { bg: '#7AA5A9', pale: '#E3F1F2', text: '#3D7A7E' },
  Career:   { bg: '#5B8FB9', pale: '#E8F0F8', text: '#2E5F8A' },
  Finance:  { bg: '#D9A441', pale: '#FDF3E0', text: '#8B6914' },
  Mindset:  { bg: '#9575CD', pale: '#F0EBF8', text: '#5E35B1' },
};

const CAT_ICONS = { Health: '💪', Learning: '📚', Career: '💼', Finance: '💰', Mindset: '🧘' };

export default function HabitManager() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState('Health');
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCat, setEditCat] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.getHabits().then(setHabits).finally(() => setLoading(false));
  }, []);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  async function addHabit(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const h = await api.addHabit(newName.trim(), newCat);
      setHabits((prev) => [...prev, h]);
      setNewName('');
      showToast(`"${h.name}" added`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAdding(false);
    }
  }

  function startEdit(habit) {
    setEditId(habit.id);
    setEditName(habit.name);
    setEditCat(habit.category);
  }

  async function saveEdit(id) {
    try {
      const updated = await api.updateHabit(id, { name: editName, category: editCat });
      setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)));
      setEditId(null);
      showToast('Habit updated');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function deleteHabit(id, name) {
    if (!window.confirm(`Remove "${name}"? Your past logs will be preserved.`)) return;
    try {
      await api.deleteHabit(id);
      setHabits((prev) => prev.filter((h) => h.id !== id));
      showToast(`"${name}" removed`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = habits.filter((h) => h.category === cat);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <div className="loading-text">Loading habits…</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Manage Habits</h1>
        <p>Add, edit or remove habits. Changes take effect immediately.</p>
      </div>

      <div className="habits-page-grid">
        {/* Habit list */}
        <div>
          {CATEGORIES.map((cat) => {
            const c = CAT_COLORS[cat];
            const catHabits = grouped[cat];
            return (
              <div key={cat} className="habit-group">
                <div
                  className="habit-group-title"
                  style={{ background: c.pale, color: c.text }}
                >
                  <span>{CAT_ICONS[cat]}</span>
                  {cat}
                  <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 11 }}>
                    {catHabits.length} habit{catHabits.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {catHabits.length === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--text-light)', padding: '8px 16px' }}>
                    No habits in this category
                  </div>
                )}

                {catHabits.map((habit) => {
                  const isEditing = editId === habit.id;
                  return (
                    <div key={habit.id} className={`habit-list-item ${isEditing ? 'editing' : ''}`}>
                      <div
                        style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: c.bg, flexShrink: 0,
                        }}
                      />

                      <div className="habit-list-name">
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(habit.id); if (e.key === 'Escape') setEditId(null); }}
                              autoFocus
                              style={{ padding: '6px 10px', border: '1.5px solid var(--green-mid)', borderRadius: 6, fontSize: 14, flex: 1 }}
                            />
                            <select
                              value={editCat}
                              onChange={(e) => setEditCat(e.target.value)}
                              style={{ padding: '6px 10px', border: '1.5px solid var(--green-mid)', borderRadius: 6, fontSize: 13 }}
                            >
                              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                            </select>
                          </div>
                        ) : (
                          habit.name
                        )}
                      </div>

                      {isEditing ? (
                        <>
                          <button className="btn-icon save" onClick={() => saveEdit(habit.id)} title="Save">✓</button>
                          <button className="btn-icon" onClick={() => setEditId(null)} title="Cancel">✕</button>
                        </>
                      ) : (
                        <>
                          <button className="btn-icon" onClick={() => startEdit(habit)} title="Edit">✏️</button>
                          <button className="btn-icon danger" onClick={() => deleteHabit(habit.id, habit.name)} title="Remove">🗑</button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Add habit form */}
        <div>
          <div className="card card-pad" style={{ position: 'sticky', top: 24 }}>
            <div className="section-title">Add New Habit</div>
            <form className="add-habit-form" onSubmit={addHabit}>
              <div className="form-group">
                <label>Habit Name</label>
                <input
                  type="text"
                  placeholder="e.g. Morning Run"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={newCat} onChange={(e) => setNewCat(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary" disabled={adding}>
                {adding ? 'Adding…' : '+ Add Habit'}
              </button>
            </form>

            <div style={{ marginTop: 24, padding: '16px', background: 'var(--bg)', borderRadius: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)', marginBottom: 8 }}>Tips</div>
              <ul style={{ fontSize: 13, color: 'var(--text-light)', paddingLeft: 18, lineHeight: 1.8 }}>
                <li>Keep habits small and specific</li>
                <li>Aim for 5–8 habits per category</li>
                <li>Removing a habit hides it but keeps your log history</li>
              </ul>
            </div>

            <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-light)', textAlign: 'center' }}>
              {habits.length} active habits total
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}
