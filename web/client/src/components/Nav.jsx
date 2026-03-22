export default function Nav({ view, setView, user, onLogout }) {
  const items = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'tracker', icon: '📅', label: 'Tracker' },
    { id: 'habits', icon: '✏️', label: 'Manage Habits' },
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🌿</div>
          <div>
            <div className="sidebar-logo-text">Habit Tracker</div>
            <div className="sidebar-logo-sub">Stay consistent</div>
          </div>
        </div>

        <div className="nav-section-label">Menu</div>
        {items.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${view === item.id ? 'active' : ''}`}
            onClick={() => setView(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="user-card">
            <div className="user-name">{user.name}</div>
            <div className="user-email">{user.email}</div>
          </div>
          <button className="btn-logout" onClick={onLogout}>
            <span>🚪</span> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          {items.map((item) => (
            <button
              key={item.id}
              className={`mobile-nav-item ${view === item.id ? 'active' : ''}`}
              onClick={() => setView(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
