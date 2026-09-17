# Fajr Tracker

A simple REST API to track and monitor Fajr prayer times.

## Features

- Create and manage Fajr prayer trackers for different locations
- Log Fajr prayer times
- Persistent data storage using JSON file
- CORS enabled for cross-origin requests

## Installation

```bash
npm install
```

## Usage

```bash
npm start
```

The API will start on port 3000 (or the PORT environment variable if set).

## API Endpoints

- `GET /` - API information
- `GET /api/trackers` - Get all trackers
- `POST /api/trackers` - Create a new tracker
- `GET /api/trackers/:id` - Get a specific tracker
- `PUT /api/trackers/:id` - Update a tracker
- `DELETE /api/trackers/:id` - Delete a tracker
- `POST /api/trackers/:id/log` - Log a Fajr prayer
- `GET /health` - Health check

## Environment Variables

- `PORT` - Server port (default: 3000)
- `DATA_FILE` - Path to data file (default: ./data.json)

## Deployment

Deploy to Railway:
1. Create a new project from this GitHub repository
2. Add environment variable: `DATA_FILE=/data/data.json`
3. Add a volume mounted at `/data`

Data will be persisted across deployments.
