jest.setTimeout(30000);

const mongoose = require('mongoose');

describe('MongoDB Connection Test: ', () => {
    // 각 테스트 전에 실행
    beforeAll(async () => {
        await mongoose.connect('mongodb://localhost:27017/testdb');
    });

    // 각 테스트 후에 실행
    afterAll(async () => {
        await mongoose.disconnect();
    });

    // 연결 테스트
    test('should connect to MongoDB', () => {
        const connectionState = mongoose.connection.readyState;
        expect(connectionState).toBe(1); // 1은 연결된 상태
    });

    // 연결 실패 테스트
    test('should fail to connect with wrong URI', async () => {
        try {
            await mongoose.disconnect(); // 기존 연결 해제
            await mongoose.connect('mongodb://wrong-uri:27017');
            fail('Expected connection to fail');
        } catch (error) {
            expect(error).toBeTruthy();
        } finally {
            // 테스트 후 다시 메모리 DB에 연결
            await mongoose.connect('mongodb://localhost:27017/testdb');
        }
    });

    // 재연결 테스트
    test('should reconnect after disconnection', async () => {
        await mongoose.disconnect();
        expect(mongoose.connection.readyState).toBe(0); // 연결 해제 상태

        await mongoose.connect('mongodb://localhost:27017/testdb');
        expect(mongoose.connection.readyState).toBe(1); // 연결된 상태
    });
});
