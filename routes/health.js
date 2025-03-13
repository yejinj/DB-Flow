const express = require('express');
const router = express.Router();
const mongoose = require('../db');

router.get('/health', async (req, res) => {
  const state = mongoose.connection.readyState;
  const status = state === 1 ? 'connected' : 'disconnected';
  res.status(200).json({ status: 'ok', db: status });
});

module.exports = router;
