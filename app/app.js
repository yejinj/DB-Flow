const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/User');
const app = express();

app.use(express.json());

// 기존 테스트용 엔드포인트
app.get('/api/users', (req, res) => {
  res.json([{ username: 'johndoe', email: 'john@example.com' }]);
});

// ✅ DB 연결 상태 확인
app.get('/api/db/health', async (req, res) => {
  const state = mongoose.connection.readyState;
  if (state === 1) {
    res.status(200).json({ status: 'connected' });
  } else {
    res.status(500).json({ status: 'disconnected' });
  }
});

// ✅ 유저 저장
app.post('/api/db/write', async (req, res) => {
  try {
    const { username, email } = req.body;
    const user = new User({ username, email });
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ 유저 조회
app.get('/api/db/read', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.query.email });
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
