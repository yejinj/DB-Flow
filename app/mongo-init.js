// MongoDB 레플리카셋 초기화 스크립트
const { MongoClient } = require('mongodb');

const initReplicaSet = async () => {
  console.log('MongoDB 레플리카셋 초기화 시작...');
  
  try {
    // mongo1에 연결
    const client = new MongoClient('mongodb://mongo1:27017');
    await client.connect();
    
    // 레플리카셋 상태 확인
    const admin = client.db('admin').admin();
    
    try {
      const status = await admin.command({ replSetGetStatus: 1 });
      console.log('레플리카셋이 이미 초기화되어 있습니다:', status.set);
      await client.close();
      return true;
    } catch (error) {
      // 레플리카셋이 초기화되지 않았으면 초기화 진행
      console.log('레플리카셋 초기화 시작...');
      
      const config = {
        _id: 'rs0',
        members: [
          { _id: 0, host: 'mongo1:27017', priority: 1 },
          { _id: 1, host: 'mongo2:27017', priority: 0.5 },
          { _id: 2, host: 'mongo3:27017', priority: 0.5 }
        ]
      };
      
      const result = await admin.command({ replSetInitiate: config });
      console.log('레플리카셋 초기화 완료:', result);
      await client.close();
      return true;
    }
  } catch (error) {
    console.error('레플리카셋 초기화 실패:', error);
    return false;
  }
};

// 레플리카셋 초기화 시도
const waitForMongo = async () => {
  let initialized = false;
  while (!initialized) {
    try {
      initialized = await initReplicaSet();
      if (initialized) {
        console.log('MongoDB 레플리카셋이 준비되었습니다.');
        process.exit(0);
      }
    } catch (error) {
      console.log('MongoDB 서버 연결 대기 중...');
    }
    
    // 5초 대기
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
};

waitForMongo(); 