const BASE = '/api';

function getToken() {
  return localStorage.getItem('ht_token');
}

async function request(method, path, body) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  register: (name, email, password) => request('POST', '/auth/register', { name, email, password }),
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  me: () => request('GET', '/auth/me'),

  getHabits: () => request('GET', '/habits'),
  addHabit: (name, category) => request('POST', '/habits', { name, category }),
  updateHabit: (id, data) => request('PUT', `/habits/${id}`, data),
  deleteHabit: (id) => request('DELETE', `/habits/${id}`),

  getLogs: (year, month) => request('GET', `/habits/logs/${year}/${month}`),
  setLog: (habit_id, date, completed) => request('POST', '/habits/logs', { habit_id, date, completed }),

  getStats: () => request('GET', '/habits/stats'),
  getHeatmap: (year, month) => request('GET', `/habits/heatmap/${year}/${month}`),
};
