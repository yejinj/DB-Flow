const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());

app.get('/api/users', (req, res) => {
  res.json([{ username: 'johndoe', email: 'john@example.com' }]);
});

module.exports = app;
