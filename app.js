const express = require('express');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 3000;
const mongoURI = process.env.MONGODB_URI || 'mongodb://mongo1:27017,mongo2:27017,mongo3:27017/myDatabase?replicaSet=rs0';

app.use(express.json());

app.get('/health', (req, res) => {
  const status = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    mongodb: status,
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({ message: '서버가 실행 중입니다!' });
});

const connectWithRetry = async () => {
  console.log('MongoDB에 연결 시도 중...');
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });

    console.log('MongoDB에 성공적으로 연결되었습니다!');
    app.listen(port, '0.0.0.0', () => {
      console.log(`서버가 http://localhost:${port} 에서 실행 중입니다`);
    });
  } catch (err) {
    console.error('MongoDB 연결 실패:', err.message);
    console.log('5초 후에 재시도합니다...');
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry();

process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console
