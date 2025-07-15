const config = {
  uri: 'mongodb://localhost:27117,localhost:27017,localhost:27019/test?replicaSet=rs0',
  defaultOptions: {
    serverSelectionTimeoutMS: 10000,
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
};

module.exports = config; 