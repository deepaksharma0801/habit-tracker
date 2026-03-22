import { useState, useEffect } from 'react';
import { api } from './api.js';
import Auth from './components/Auth.jsx';
import Nav from './components/Nav.jsx';
import Dashboard from './components/Dashboard.jsx';
import Tracker from './components/Tracker.jsx';
import HabitManager from './components/HabitManager.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [booting, setBooting] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('ht_token');
    if (!token) { setBooting(false); return; }
    api.me()
      .then(setUser)
      .catch(() => localStorage.removeItem('ht_token'))
      .finally(() => setBooting(false));
  }, []);

  function onAuth(u) {
    setUser(u);
    setView('dashboard');
  }

  function onLogout() {
    localStorage.removeItem('ht_token');
    setUser(null);
  }

  if (booting) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <div className="loading-text">Loading…</div>
      </div>
    );
  }

  if (!user) return <Auth onAuth={onAuth} />;

  return (
    <div className="app-layout">
      <Nav view={view} setView={setView} user={user} onLogout={onLogout} />
      <main className="main-content">
        {view === 'dashboard' && <Dashboard user={user} />}
        {view === 'tracker' && <Tracker />}
        {view === 'habits' && <HabitManager />}
      </main>
    </div>
  );
}
