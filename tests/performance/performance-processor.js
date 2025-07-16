const faker = require('faker');

// 랜덤 문자열 생성
function randomString(length = 10) {
  return faker.random.alphaNumeric(length);
}

// 랜덤 이메일 생성
function randomEmail() {
  return faker.internet.email();
}

// 랜덤 정수 생성
function randomInt(min, max) {
  return faker.datatype.number({ min, max });
}

// 랜덤 이름 생성
function randomName() {
  return faker.name.findName();
}

// 랜덤 주소 생성
function randomAddress() {
  return faker.address.streetAddress();
}

// 랜덤 전화번호 생성
function randomPhone() {
  return faker.phone.phoneNumber();
}

// 랜덤 날짜 생성
function randomDate() {
  return faker.date.past().toISOString();
}

// 랜덤 금액 생성
function randomAmount(min = 100, max = 10000) {
  return faker.datatype.number({ min, max });
}

// 랜덤 사용자 ID 생성
function randomUserId() {
  return faker.datatype.number({ min: 1, max: 1000 });
}

// 랜덤 카테고리 생성
function randomCategory() {
  const categories = ['electronics', 'clothing', 'books', 'home', 'sports'];
  return faker.random.arrayElement(categories);
}

// 랜덤 상태 생성
function randomStatus() {
  const statuses = ['active', 'inactive', 'pending', 'completed', 'cancelled'];
  return faker.random.arrayElement(statuses);
}

module.exports = {
  randomString,
  randomEmail,
  randomInt,
  randomName,
  randomAddress,
  randomPhone,
  randomDate,
  randomAmount,
  randomUserId,
  randomCategory,
  randomStatus
}; 