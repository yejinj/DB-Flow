module.exports = {
    mongodbMemoryServerOptions: {
      instance: {
        dbName: 'test-db',
      },
      binary: {
        version: '6.0.0',
        skipMD5: true,
      },
      autoStart: false,
    },
  };
  