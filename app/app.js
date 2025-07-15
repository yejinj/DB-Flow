require('dotenv').config({ path: '../.env' });
const express = require('express');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT;
const mongoURI = process.env.MONGODB_URI;

app.use(express.json());

// 정적 파일 서빙
app.use(express.static('public'));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.get('/health', (req, res) => { // 서버, 데이터베이스 상태 확인
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ok', server: 'running', mongodb: mongoStatus });
});

// 메인 페이지는 index.html로 서빙됨 (정적 파일)

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

app.delete('/api/users/:id', async (req, res) => { // 사용자 삭제
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }
    res.json({ message: '사용자가 성공적으로 삭제되었습니다' });
  } catch (err) {
    res.status(500).json({ error: '사용자 삭제 실패' });
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
