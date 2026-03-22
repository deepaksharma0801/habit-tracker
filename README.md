# 🌿 Habit Tracker

A full-stack habit tracking web app with login, persistent data, and beautiful analytics — built with React, Node.js, and SQLite.

![Habit Tracker Dashboard](https://img.shields.io/badge/status-active-brightgreen) ![Node](https://img.shields.io/badge/node-v22%2B-green) ![License](https://img.shields.io/badge/license-MIT-blue)

---

## Features of this dashboard

- **Secure Auth** — Register and log in with email/password. Sessions persist for 30 days via JWT.
- **Daily Tracker** — Full monthly calendar grid. Click any cell to mark a habit done or undone.
- **Dashboard** — KPI cards, category performance bars, monthly heatmap, and today's quick check-in.
- **Streaks & Stats** — Automatic completion %, current streak, and longest streak per habit.
- **Manage Habits** — Add, edit, or remove habits grouped by category. 30 default habits pre-loaded on signup.
- **Fully Offline** — No external database or cloud service. Everything stored locally in SQLite.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | SQLite (built-in `node:sqlite`) |
| Auth | JWT + bcrypt |
| Styling | Custom CSS (no frameworks) |

---

## Getting Started

### Prerequisites

- Node.js v22 or higher
- npm

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/habit-tracker.git
cd habit-tracker/web

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### Running the App

You need two terminals:

**Terminal 1 — Backend**
```bash
cd web/server
node index.js
```

**Terminal 2 — Frontend**
```bash
cd web/client
npm run dev
```

Then open **http://localhost:5173** in your browser.

> If port 3001 or 5173 is already in use:
> ```bash
> lsof -ti tcp:3001 | xargs kill -9
> lsof -ti tcp:5173 | xargs kill -9
> ```

---

## Project Structure

```
web/
├── server/
│   ├── data/               # SQLite database (auto-created)
│   ├── routes/
│   │   ├── auth.js         # Register, login, /me
│   │   └── habits.js       # Habits CRUD, logs, stats, heatmap
│   ├── middleware/
│   │   └── auth.js         # JWT verification
│   ├── db.js               # Database init & default habits seed
│   ├── index.js            # Express app entry point
│   └── .env                # Environment variables
└── client/
    └── src/
        ├── components/
        │   ├── Auth.jsx        # Login / Register page
        │   ├── Dashboard.jsx   # KPIs, heatmap, check-in
        │   ├── Tracker.jsx     # Monthly habit grid
        │   ├── HabitManager.jsx# Add / edit / delete habits
        │   └── Nav.jsx         # Sidebar + mobile nav
        ├── App.jsx             # Root component + routing
        ├── api.js              # All API calls
        └── index.css           # Design system + styles
```

---

## Default Habits

On registration, 30 habits are automatically created across 5 categories:

| Category | Habits |
|----------|--------|
| 💪 Health | Morning Exercise, Hydration, Sleep by 10pm, No Junk Food, 10k Steps, Cook at Home |
| 📚 Learning | Read 30 min, Journal, Learn Language, Gratitude List, Practice Skill, Creative Work, Learning Module |
| 💼 Career | Deep Work Block, Review Goals, No Social Media, Networking, Side Project, Read News, Email Zero, Plan Tomorrow, Weekly Review, Portfolio Update |
| 💰 Finance | Savings Transfer, Track Spending, No Impulse Buys |
| 🧘 Mindset | Affirmations, Outdoor Time, Digital Detox, Meditation 10 min |

All habits are fully editable — add your own, rename, or remove any.

---

## Environment Variables

The server reads from `server/.env`:

```env
PORT=3001
JWT_SECRET=your-secret-key-here
CLIENT_URL=http://localhost:5173
```

> Change `JWT_SECRET` to a strong random string before deploying.

---

## License

MIT
