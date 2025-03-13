const mongoose = require('mongoose');

const TestSchema = new mongoose.Schema({
    name: String,
    value: Number,
    createdAt: { type: Date, default: Date.now }
});

const TestModel = mongoose.model('Test', TestSchema);

describe('MongoDB CRUD Operations', () => {
    beforeAll(async () => {
        await mongoose.connect('mongodb://localhost:27017/testdb');
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    beforeEach(async () => {
        await TestModel.deleteMany({});
        
        await TestModel.create({ name: 'item1', value: 1 });
        await TestModel.create({ name: 'item2', value: 2 });
    });

    test('should handle bulk operations', async () => {
        await TestModel.deleteMany({});
        
        const docs = Array.from({ length: 100 }, (_, i) => ({
            name: `item${i}`,
            value: i
        }));

        await TestModel.insertMany(docs);
        
        const count = await TestModel.countDocuments();
        expect(count).toBe(100);

        await TestModel.updateMany(
            { value: { $gte: 50 } },
            { $set: { name: 'high value' } }
        );

        const highValueDocs = await TestModel.find({ name: 'high value' });
        expect(highValueDocs).toHaveLength(50);
    });
});
