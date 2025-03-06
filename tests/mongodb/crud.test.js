jest.setTimeout(60000);

const mongoose = require('mongoose');

const TestSchema = new mongoose.Schema({
    name: String,
    value: Number,
    createdAt: { type: Date, default: Date.now }
});

const TestModel = mongoose.model('Test', TestSchema);

describe('MongoDB CRUD Operations', () => {
    beforeAll(async () => {
        try {
            await mongoose.connect('mongodb://localhost:27017/testdb', {
                serverSelectionTimeoutMS: 30000,
                socketTimeoutMS: 45000,
            });
        } catch (error) {
            console.error('MongoDB 연결 실패:', error);
            throw error;
        }
    });

    afterAll(async () => {
        try {
            await mongoose.disconnect();
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error('연결 종료 실패:', error);
        }
    });

    beforeEach(async () => {
        await TestModel.deleteMany({});
        
        // 테스트 데이터 생성
        await TestModel.create({ name: 'item1', value: 1 });
        await TestModel.create({ name: 'item2', value: 2 });
    });

    // Create 테스트
    test('document should be created', async () => {
        const testDoc = new TestModel({
            name: 'test item',
            value: 123
        });
        
        const savedDoc = await testDoc.save();
        expect(savedDoc.name).toBe('test item');
        expect(savedDoc.value).toBe(123);
        expect(savedDoc._id).toBeDefined();
    });

    // Read 테스트
    test('should read documents', async () => {
        const docs = await TestModel.find();
        expect(docs).toHaveLength(2);
        expect(docs[0].name).toBe('item1');
        expect(docs[1].value).toBe(2);
    });

    // Update 테스트
    test('should update a document', async () => {
        const doc = await TestModel.create({
            name: 'original',
            value: 100
        });

        const updated = await TestModel.findByIdAndUpdate(
            doc._id,
            { name: 'updated', value: 200 },
            { new: true }
        );

        expect(updated.name).toBe('updated');
        expect(updated.value).toBe(200);
    });

    // Delete 테스트
    test('should delete a document', async () => {
        const doc = await TestModel.create({
            name: 'to be deleted',
            value: 999
        });

        await TestModel.findByIdAndDelete(doc._id);
        const found = await TestModel.findById(doc._id);
        expect(found).toBeNull();
    });

    // 대량 데이터 처리 테스트
    test('should handle bulk operations', async () => {
        await TestModel.deleteMany({});
        
        const docs = Array.from({ length: 1000 }, (_, i) => ({
            name: `item${i}`,
            value: i
        }));

        await TestModel.insertMany(docs);
        
        const count = await TestModel.countDocuments();
        expect(count).toBe(100);

        await TestModel.updateMany(
            { value: { $gte: 50 } },
            { $set: { name: 'gt than 50' } }
        );

        const highValueDocs = await TestModel.find({ name: 'gt than 50' });
        expect(highValueDocs).toHaveLength(50);
    });
});
