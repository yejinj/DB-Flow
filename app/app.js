const express = require('express');
const mongoose = require('mongoose');

const app = express();

app.use(express.json());

const mongodbConnectionStatus = new client.Gauge({
  name: 'mongodb_connection_status',
  help: 'MongoDB connection status (1 = connected, 0 = disconnected)'
});

app.get('/api/users', (req, res) => {
  res.json([{ username: 'johndoe', email: 'john@example.com' }]);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

module.exports = app;
