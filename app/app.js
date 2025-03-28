const express = require('express');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 3000;
const mongoURI = process.env.MONGODB_URI || 'mongodb://mongo1:27017,mongo2:27017,mongo3:27017/myDatabase?replicaSet=rs0';

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.get('/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ok', server: 'running', mongodb: mongoStatus });
});

app.get('/', (req, res) => {
  res.json({ message: 'ok' });
});

app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: '사용자1' },
    { id: 2, name: '사용자2' }
  ]);
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

process.on('SIGINT', () => {
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
