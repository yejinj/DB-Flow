const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

describe('MongoDB Connection Tests', () => {
    let mongoServer;
    
    // 각 테스트 전에 실행
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    });

    // 각 테스트 후에 실행
    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    // 연결 테스트
    test('should connect to MongoDB', () => {
        const connectionState = mongoose.connection.readyState;
        expect(connectionState).toBe(1); // 1은 연결된 상태
    });

    // 연결 실패 테스트
    test('should fail to connect with wrong URI', async () => {
        try {
            await mongoose.connect('mongodb://wrong-uri:27017');
            fail('Expected connection to fail');
        } catch (error) {
            expect(error).toBeTruthy();
        }
    });

    // 재연결 테스트
    test('should reconnect after disconnection', async () => {
        await mongoose.disconnect();
        expect(mongoose.connection.readyState).toBe(0); // 0은 연결 해제 상태

        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
        expect(mongoose.connection.readyState).toBe(1);
    });
});
