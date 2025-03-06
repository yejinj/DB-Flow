jest.setTimeout(30000);

const mongoose = require('mongoose');

describe('MongoDB Connection Test: ', () => {
    
    beforeAll(async () => {
        await mongoose.connect('mongodb://localhost:27017/testdb');
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    test('should be connected to MongoDB', () => {
        const connectionState = mongoose.connection.readyState;
        expect(connectionState).toBe(1);
    });

    test('should fail to connect with wrong URI', async () => {
        try {
            await mongoose.disconnect();
            await mongoose.connect('mongodb://wrong-uri');
            fail('Expected connection to be rejected');
        } catch (error) {
            expect(error).toBeTruthy();
        } finally {
            await mongoose.connect('mongodb://localhost:27017/testdb');
        }
    });

    test('should reconnect after disconnection', async () => {
        await mongoose.disconnect();
        expect(mongoose.connection.readyState).toBe(0);

        await mongoose.connect('mongodb://localhost:27017/testdb');
        expect(mongoose.connection.readyState).toBe(1);
    });
});
