const mongoose = require('mongoose');
const User = require('../../models/User');

beforeAll(async () => {
  await mongoose.connect('mongodb://localhost:27017/test', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

test('Create and find user', async () => {
  const user = new User({ username: 'johndoe', email: 'john@example.com' });
  await user.save();
  const foundUser = await User.findOne({ email: 'john@example.com' });
  expect(foundUser.username).toBe('johndoe');
});
