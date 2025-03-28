const express = require('express');
const mongoose = require('mongoose');
const app = express();
const port = 3000;

// 기본 미들웨어
app.use(express.json());

// 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// 헬스 체크 엔드포인트
app.get('/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    server: 'running',
    mongodb: mongoStatus
  });
});

// 기본 라우트
app.get('/', (req, res) => {
  res.json({ message: '서버가 실행 중입니다!' });
});

// API 엔드포인트 - 예시
app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: '사용자1' },
    { id: 2, name: '사용자2' }
  ]);
});

// 서버 시작 (MongoDB 연결 전에)
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`서버가 포트 ${port}에서 시작되었습니다`);
});

// MongoDB 연결
const mongoURI = process.env.MONGODB_URI || 'mongodb://mongo1:27017,mongo2:27017,mongo3:27017/myDatabase?replicaSet=rs0';

const connectMongo = async () => {
  try {
    console.log('MongoDB에 연결 시도 중...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000
    });
    console.log('MongoDB에 성공적으로 연결되었습니다!');
  } catch (err) {
    console.error('MongoDB 연결 실패:', err.message);
    console.log('10초 후에 재시도합니다...');
    setTimeout(connectMongo, 10000);
  }
};

// MongoDB 연결 시작
connectMongo();

// 애플리케이션 종료 처리
process.on('SIGINT', () => {
  server.close(() => {
    console.log('서버가 종료되었습니다');
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close(() => {
        console.log('MongoDB 연결이 종료되었습니다');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});
