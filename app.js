const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env'
});
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const MONGO_URI = 'mongodb://mongo1:27017,mongo2:27017,mongo3:27017/test?replicaSet=rs0';
console.log('[NODE_ENV]', process.env.NODE_ENV);
console.log('[MONGODB_URI]', process.env.MONGODB_URI);

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection failed:', err));

app.get('/health', async (req, res) => {
  const state = mongoose.connection.readyState;
  const status = state === 1 ? 'connected' : 'disconnected';
  res.status(200).json({ status: 'ok', db: status });
});

app.post('/api/test', async (req, res) => {
  try {
    const testCollection = mongoose.connection.collection('test');
    const result = await testCollection.insertOne({
      message: 'test',
      timestamp: new Date()
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/test', async (req, res) => {
  try {
    const testCollection = mongoose.connection.collection('test');
    const data = await testCollection.find({}).toArray();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;

