const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Use /data/data.json from environment variable or default
const DATA_FILE = process.env.DATA_FILE || './data.json';
const DATA_DIR = path.dirname(DATA_FILE);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Load data from file
function loadData() {
  ensureDataDir();
  try {
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (!Array.isArray(parsed.users)) parsed.users = [];
      if (!Array.isArray(parsed.logs)) parsed.logs = [];
      return parsed;
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
  return { users: [], logs: [] };
}

// Save data to file
function saveData(data) {
  ensureDataDir();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// Match the frontend's slugify exactly, so usernames map consistently
function slugify(name) {
  return (
    String(name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'friend'
  );
}

// ---- API ----

// Full board state: every user + every logged day (home/masjid/missed)
app.get('/api/state', (req, res) => {
  const data = loadData();
  res.json({ users: data.users, logs: data.logs });
});

// Register/join as a user (idempotent - safe to call every time someone opens the app)
app.post('/api/users', (req, res) => {
  const { user } = req.body || {};
  if (!user || !String(user).trim()) {
    return res.status(400).json({ error: 'user is required' });
  }

  const name = String(user).trim().slice(0, 30);
  const slug = slugify(name);
  const data = loadData();

  const existing = data.users.find((u) => u.slug === slug);
  if (!existing) {
    data.users.push({ name, slug, joinedAt: new Date().toISOString() });
    saveData(data);
  }

  res.json({ name, slug });
});

// Log (or clear) a prayer status for a given day
app.post('/api/log', (req, res) => {
  const { user, date, status } = req.body || {};

  if (!user || !String(user).trim()) {
    return res.status(400).json({ error: 'user is required' });
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'valid date is required (YYYY-MM-DD)' });
  }
  const validStatuses = ['home', 'masjid', 'missed', 'clear'];
  if (!validStatuses.includes(status)) {
    return res
      .status(400)
      .json({ error: 'status must be one of: home, masjid, missed, clear' });
  }

  const name = String(user).trim().slice(0, 30);
  const slug = slugify(name);
  const data = loadData();

  if (!data.users.find((u) => u.slug === slug)) {
    data.users.push({ name, slug, joinedAt: new Date().toISOString() });
  }

  const idx = data.logs.findIndex((l) => l.slug === slug && l.date === date);

  if (status === 'clear') {
    if (idx !== -1) data.logs.splice(idx, 1);
  } else if (idx !== -1) {
    data.logs[idx].status = status;
    data.logs[idx].timestamp = new Date().toISOString();
  } else {
    data.logs.push({ slug, date, status, timestamp: new Date().toISOString() });
  }

  saveData(data);
  res.json({ ok: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Fajr Tracker running on port ${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
