const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB 연결 성공'))
.catch((err) => console.error('MongoDB 연결 실패:', err));

// 테스트 라우트
app.get('/', (req, res) => {
    res.status(500).json({ 
        message: '서버 에러 테스트',
        version: '1.0.4'
    });
});

// 테스트 데이터 저장 API
app.post('/api/test', async (req, res) => {
  try {
    const testCollection = mongoose.connection.collection('test');
    const result = await testCollection.insertOne({ 
      message: "테스트 데이터",
      timestamp: new Date() 
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 테스트 데이터 조회 API
app.get('/api/test', async (req, res) => {
  try {
    const testCollection = mongoose.connection.collection('test');
    const data = await testCollection.find({}).toArray();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

<<<<<<< HEAD
// 테스트 라우트
=======
// 서버 상태 확인 API
>>>>>>> 8650e933c44d2dcf954c75fd03910d3baf90193a
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        message: 'Health check passed'
    });
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`서버가 ${PORT} 포트에서 실행중입니다.`);
}); 