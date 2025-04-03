require('dotenv').config({ path: '../.env' });
const express = require('express');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT;
const mongoURI = process.env.MONGODB_URI;

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.get('/health', (req, res) => { // 서버, 데이터베이스 상태 확인
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ok', server: 'running', mongodb: mongoStatus });
});

app.get('/', (req, res) => {
  res.json({ message: 'ok' });
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

app.get('/api/users', async (req, res) => { // 사용자 조회
  try {
    const users = await User.find().select('-__v');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: '사용자 목록 조회 실패' });
  }
});

app.post('/api/users', async (req, res) => { // 사용자 생성
  try {
    const { name, email } = req.body;
    const user = new User({ name, email });
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: '사용자 생성 실패' });
  }
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`listening on port ${port}`);
});

const connectMongo = async () => {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    setTimeout(connectMongo, 10000);
  }
};

connectMongo();

process.on('SIGINT', () => { // ctrl+c 신호 처리
  server.close(() => {
    console.log('server closed');
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close(() => {
        console.log('MongoDB disconnected');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});
