const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB 연결 성공'))
.catch((err) => console.error('MongoDB 연결 실패:', err));

app.get('/', (req, res) => {
    res.status(500).json({ 
        message: '서버 에러 테스트',
        version: '1.0.4'
    });
});

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

app.get('/api/test', async (req, res) => {
  try {
    const testCollection = mongoose.connection.collection('test');
    const data = await testCollection.find({}).toArray();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', async (req, res) => {
  const state = mongoose.connection.readyState;
  const status = state === 1 ? 'connected' : 'disconnected';
  res.status(200).json({ status: 'ok', db: status });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`서버가 ${PORT} 포트에서 실행중입니다.`);
}); 