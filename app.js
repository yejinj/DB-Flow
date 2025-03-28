const express = require('express');
const mongoose = require('mongoose');
const app = express();
const port = process.env.PORT || 3000;

// 환경 변수에서 MongoDB URI 가져오기
const mongoURI = process.env.MONGODB_URI || 'mongodb://mongo1:27017,mongo2:27017,mongo3:27017/myDatabase?replicaSet=rs0';

// JSON 파싱 미들웨어
app.use(express.json());

// 서버 상태 엔드포인트
app.get('/health', (req, res) => {
  const status = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    mongodb: status,
    timestamp: new Date().toISOString()
  });
});

// 기본 라우트
app.get('/', (req, res) => {
  res.json({ message: '서버가 실행 중입니다!' });
});

// API 라우트 - 사용자 목록 (더미 데이터)
app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: '사용자1' },
    { id: 2, name: '사용자2' },
    { id: 3, name: '사용자3' }
  ]);
});

// MongoDB 연결 함수
const connectWithRetry = async () => {
  console.log('MongoDB에 연결 시도 중...');
  
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('MongoDB에 성공적으로 연결되었습니다!');
    
    // MongoDB 연결 성공 후 서버 시작
    app.listen(port, '0.0.0.0', () => {
      console.log(`서버가 http://localhost:${port} 에서 실행 중입니다`);
    });
    
  } catch (err) {
    console.error('MongoDB 연결 실패:', err.message);
    console.log('5초 후에 재시도합니다...');
    setTimeout(connectWithRetry, 5000);
  }
};

// 연결 시작
connectWithRetry();

// 앱 종료 시 MongoDB 연결 닫기
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('MongoDB 연결이 종료되었습니다');
    process.exit(0);
  });
}); 