const config = {
  uri: 'mongodb://mongo1:27017,mongo2:27017,mongo3:27017/test?replicaSet=rs0',
  defaultOptions: {
    serverSelectionTimeoutMS: 10000
  }
};

module.exports = config; 