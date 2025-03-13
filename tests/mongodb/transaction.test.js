jest.setTimeout(60000);

const mongoose = require('mongoose');

const SampleSchema = new mongoose.Schema({
    name: String,
    value: Number,
    createdAt: { type: Date, default: Date.now }
});

const SampleModel = mongoose.model('Sample', SampleSchema);

describe('MongoDB Sample CRUD Operations', () => {
    beforeAll(async () => {
        await mongoose.connect('mongodb://localhost:27017/testdb', {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    beforeEach(async () => {
        await SampleModel.deleteMany({});
        await SampleModel.create({ name: 'sample1', value: 10 });
        await SampleModel.create({ name: 'sample2', value: 20 });
    });

    test('should create a new document', async () => {
        const sampleDoc = new SampleModel({
            name: 'new sample',
            value: 300
        });

        const savedDoc = await sampleDoc.save();
        expect(savedDoc.name).toBe('new sample');
        expect(savedDoc.value).toBe(300);
        expect(savedDoc._id).toBeDefined();
    });

    test('should read documents', async () => {
        const docs = await SampleModel.find();
        expect(docs).toHaveLength(2);
        expect(docs[0].name).toBe('sample1');
        expect(docs[1].value).toBe(20);
    });

    test('should update a document', async () => {
        const doc = await SampleModel.create({
            name: 'old name',
            value: 50
        });

        const updated = await SampleModel.findByIdAndUpdate(
            doc._id,
            { name: 'new name', value: 100 },
            { new: true }
        );

        expect(updated.name).toBe('new name');
        expect(updated.value).toBe(100);
    });

    test('should delete a document', async () => {
        const doc = await SampleModel.create({
            name: 'to be removed',
            value: 999
        });

        await SampleModel.findByIdAndDelete(doc._id);
        const found = await SampleModel.findById(doc._id);
        expect(found).toBeNull();
    });
});