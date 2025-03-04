const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// 테스트용 주문 스키마
const OrderSchema = new mongoose.Schema({
    productName: String,
    quantity: Number,
    status: String
});

// 테스트용 재고 스키마
const InventorySchema = new mongoose.Schema({
    productName: String,
    stockCount: Number
});

const Order = mongoose.model('Order', OrderSchema);
const Inventory = mongoose.model('Inventory', InventorySchema);

describe('MongoDB Transaction Tests', () => {
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
        await Order.deleteMany({});
        await Inventory.deleteMany({});
    });

    // 여러 작업이 하나의 단위로 처리되는 트랜잭션 테스트
    test('should process multiple operations as one unit', async () => {
        // 초기 재고 설정
        await Inventory.create({
            productName: '테스트상품',
            stockCount: 10
        });

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. 주문 생성
            const order = await Order.create([{
                productName: '테스트상품',
                quantity: 3,
                status: 'pending'
            }], { session });

            // 2. 재고 감소
            await Inventory.findOneAndUpdate(
                { productName: '테스트상품' },
                { $inc: { stockCount: -3 } },
                { session }
            );

            // 3. 주문 상태 업데이트
            await Order.findByIdAndUpdate(
                order[0]._id,
                { status: 'completed' },
                { session }
            );

            await session.commitTransaction();

            // 트랜잭션 결과 확인
            const finalOrder = await Order.findById(order[0]._id);
            const finalInventory = await Inventory.findOne({ productName: '테스트상품' });

            expect(finalOrder.status).toBe('completed');
            expect(finalInventory.stockCount).toBe(7);

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    });

    // 트랜잭션 중 에러 발생 시 모든 작업 롤백 테스트
    test('should rollback all operations on error', async () => {
        // 초기 재고 설정
        await Inventory.create({
            productName: '테스트상품',
            stockCount: 10
        });

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. 주문 생성
            const order = await Order.create([{
                productName: '테스트상품',
                quantity: 3,
                status: 'pending'
            }], { session });

            // 2. 재고 감소
            await Inventory.findOneAndUpdate(
                { productName: '테스트상품' },
                { $inc: { stockCount: -3 } },
                { session }
            );

            // 3. 의도적 에러 발생
            throw new Error('트랜잭션 테스트 에러');

        } catch (error) {
            await session.abortTransaction();
        } finally {
            session.endSession();
        }

        // 모든 작업이 롤백되었는지 확인
        const finalOrder = await Order.findOne({ productName: '테스트상품' });
        const finalInventory = await Inventory.findOne({ productName: '테스트상품' });

        expect(finalOrder).toBeNull(); // 주문이 생성되지 않음
        expect(finalInventory.stockCount).toBe(10); // 재고가 원래대로 유지
    });
}); 