const config = {
  uri: 'mongodb://localhost:27017/test',
  defaultOptions: {
    serverSelectionTimeoutMS: 10000,
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
};

module.exports = config; 