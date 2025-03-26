const express = require('express');
const mongoose = require('mongoose');
const promBundle = require('express-prom-bundle');
const client = require('prom-client');

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { app: 'nodejs-app' },
  promClient: {
    collectDefaultMetrics: {
      timeout: 5000
    }
  }
});

const app = express();

app.use(metricsMiddleware);
app.use(express.json());

const mongodbConnectionStatus = new client.Gauge({
  name: 'mongodb_connection_status',
  help: 'MongoDB connection status (1 = connected, 0 = disconnected)'
});

mongoose.connection.on('connected', () => {
  mongodbConnectionStatus.set(1);
});

mongoose.connection.on('disconnected', () => {
  mongodbConnectionStatus.set(0);
});

app.get('/api/users', (req, res) => {
  res.json([{ username: 'johndoe', email: 'john@example.com' }]);
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

module.exports = app;
