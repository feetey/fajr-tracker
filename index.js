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
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
  return { trackers: [] };
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

// Routes
app.get('/', (req, res) => {
  res.json({
    name: 'Fajr Tracker API',
    version: '1.0.0',
    description: 'Track and monitor Fajr prayer times',
    endpoints: {
      'GET /api/trackers': 'Get all Fajr trackers',
      'POST /api/trackers': 'Create a new tracker',
      'GET /api/trackers/:id': 'Get a specific tracker',
      'PUT /api/trackers/:id': 'Update a tracker',
      'DELETE /api/trackers/:id': 'Delete a tracker',
      'POST /api/trackers/:id/log': 'Log a Fajr prayer'
    }
  });
});

// Get all trackers
app.get('/api/trackers', (req, res) => {
  const data = loadData();
  res.json(data.trackers);
});

// Create a new tracker
app.post('/api/trackers', (req, res) => {
  const { name, location } = req.body;

  if (!name || !location) {
    return res.status(400).json({ error: 'Name and location are required' });
  }

  const data = loadData();
  const tracker = {
    id: Date.now().toString(),
    name,
    location,
    createdAt: new Date().toISOString(),
    logs: []
  };

  data.trackers.push(tracker);
  saveData(data);

  res.status(201).json(tracker);
});

// Get a specific tracker
app.get('/api/trackers/:id', (req, res) => {
  const data = loadData();
  const tracker = data.trackers.find(t => t.id === req.params.id);

  if (!tracker) {
    return res.status(404).json({ error: 'Tracker not found' });
  }

  res.json(tracker);
});

// Update a tracker
app.put('/api/trackers/:id', (req, res) => {
  const { name, location } = req.body;
  const data = loadData();
  const tracker = data.trackers.find(t => t.id === req.params.id);

  if (!tracker) {
    return res.status(404).json({ error: 'Tracker not found' });
  }

  if (name) tracker.name = name;
  if (location) tracker.location = location;

  saveData(data);
  res.json(tracker);
});

// Delete a tracker
app.delete('/api/trackers/:id', (req, res) => {
  const data = loadData();
  const index = data.trackers.findIndex(t => t.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Tracker not found' });
  }

  const deleted = data.trackers.splice(index, 1);
  saveData(data);
  res.json(deleted[0]);
});

// Log a Fajr prayer
app.post('/api/trackers/:id/log', (req, res) => {
  const { time, notes } = req.body;
  const data = loadData();
  const tracker = data.trackers.find(t => t.id === req.params.id);

  if (!tracker) {
    return res.status(404).json({ error: 'Tracker not found' });
  }

  const log = {
    logId: Date.now().toString(),
    time: time || new Date().toISOString(),
    notes: notes || '',
    timestamp: new Date().toISOString()
  };

  tracker.logs.push(log);
  saveData(data);
  res.status(201).json(log);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Fajr Tracker API running on port ${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
