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

    test('should read documents', async () => {
        const docs = await TestModel.find();
        expect(docs).toHaveLength(2);
        expect(docs[0].name).toBe('item1');
        expect(docs[1].value).toBe(2);
    });

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

    test('should delete a document', async () => {
        const doc = await TestModel.create({
            name: 'to be deleted',
            value: 999
        });

        await TestModel.findByIdAndDelete(doc._id);
        const found = await TestModel.findById(doc._id);
        expect(found).toBeNull();
    });
});
