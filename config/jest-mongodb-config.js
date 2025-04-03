module.exports = {
  mongodbMemoryServerOptions: {
    instance: {
      dbName: 'test-db',
    },
    binary: {
      version: '6.0.0',
      skipMD5: true, // 바이너리 체크섬 생략
    },
    autoStart: false,
  },
};
