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
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (!parsed.members) parsed.members = {};
      if (!parsed.checkins) parsed.checkins = [];
      return parsed;
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
  return { members: {}, checkins: [] };
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

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Compute current consecutive-day streak for a member.
// Streak counts backward from today if they've already checked in today,
// otherwise it counts backward from yesterday (so a missed "today" doesn't
// zero out the streak until the day is over).
function computeStreak(name, checkins) {
  const dates = new Set(
    checkins.filter((c) => c.name === name).map((c) => c.date)
  );

  const cursor = new Date();
  if (!dates.has(todayStr())) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const ds = cursor.toISOString().slice(0, 10);
    if (dates.has(ds)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// ---- API ----

// Full group state: every member, whether they've checked in today, and streak
app.get('/api/state', (req, res) => {
  const data = loadData();
  const today = todayStr();

  const members = Object.keys(data.members)
    .map((name) => ({
      name,
      checkedInToday: data.checkins.some(
        (c) => c.name === name && c.date === today
      ),
      streak: computeStreak(name, data.checkins),
      joinedAt: data.members[name].joinedAt,
    }))
    .sort((a, b) => b.streak - a.streak || a.name.localeCompare(b.name));

  res.json({ today, members });
});

// Join the group (idempotent - safe to call every time someone opens the app)
app.post('/api/join', (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const cleanName = name.trim().slice(0, 40);
  const data = loadData();

  if (!data.members[cleanName]) {
    data.members[cleanName] = { joinedAt: new Date().toISOString() };
    saveData(data);
  }

  res.json({ name: cleanName });
});

// Check in for today's Fajr prayer
app.post('/api/checkin', (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const cleanName = name.trim().slice(0, 40);
  const data = loadData();

  if (!data.members[cleanName]) {
    data.members[cleanName] = { joinedAt: new Date().toISOString() };
  }

  const today = todayStr();
  const already = data.checkins.some(
    (c) => c.name === cleanName && c.date === today
  );

  if (!already) {
    data.checkins.push({
      name: cleanName,
      date: today,
      timestamp: new Date().toISOString(),
    });
  }

  saveData(data);
  res.json({ ok: true, alreadyCheckedIn: already });
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
