const users = [
  {
    user_id: 1,
    provider: 'native',
    email: 'user1@test.com',
    password: 'test',
    name: 'testName',
    picture: 'test.png',
    birthday: '2021-06-20',
    gender: 'Male',
    address: 'taiwan',
    geocode: 'POINT(0 0)',
    native: 'zh-TW',
    learning: 'en-US',
    introduction: 'test',
    interest: 'Cycling',
    token: 'testToken'
  },
  {
    user_id: 2,
    provider: 'native',
    email: 'user2@test.com',
    password: 'test',
    name: 'testName',
    picture: 'test.png',
    birthday: '2021-06-20',
    gender: 'Male',
    address: 'taiwan',
    geocode: 'POINT(0 0)',
    native: 'zh-TW',
    learning: 'en-US',
    introduction: 'test',
    interest: 'Cycling',
    token: 'testToken'
  }
]

const friends = [{
  sender_id: 2,
  receiver_id: 1,
  read: 0
}]

module.exports = {
  users,
  friends
}
