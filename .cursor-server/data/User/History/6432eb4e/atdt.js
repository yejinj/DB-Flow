const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// 테스트용 스키마 정의
const TestSchema = new mongoose.Schema({
    name: String,
    value: Number,
    createdAt: { type: Date, default: Date.now }
});

const TestModel = mongoose.model('Test', TestSchema);

describe('MongoDB CRUD Operations', () => {
    let mongoServer;
    
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        await TestModel.deleteMany({});  // 데이터베이스 컬렉션 비우기(일치시키기)
        
        // 테스트 데이터 생성
        await TestModel.create({ name: 'item1', value: 1 });
        await TestModel.create({ name: 'item2', value: 2 });
    });

    // Create 테스트
    test('should create a new document', async () => {
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
        // 100개의 문서 생성
        const docs = Array.from({ length: 100 }, (_, i) => ({
            name: `item${i}`,
            value: i
        }));

        await TestModel.insertMany(docs);
        
        const count = await TestModel.countDocuments();
        expect(count).toBe(100);

        // value가 50 이상인 문서들 업데이트
        await TestModel.updateMany(
            { value: { $gte: 50 } },
            { $set: { name: 'high value' } }
        );

        const highValueDocs = await TestModel.find({ name: 'high value' });
        expect(highValueDocs).toHaveLength(50);
    });
});
