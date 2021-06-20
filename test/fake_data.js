const users = [
  {
    provider: 'native',
    email: 'test@test.com',
    password: 'test',
    name: 'testName',
    picture: 'test.png',
    birthday: '2021-06-20',
    gender: 'Male',
    address: 'test',
    geocode: 'ST_PointFromText(\'POINT(0 0)\',3857)',
    native: 'zh-TW',
    learning: 'en-US',
    introduction: 'test',
    interest: 'Cycling',
    token: 'testToken'
  },
  {
    provider: 'native',
    email: 'test2@test.com',
    password: 'test2',
    name: 'test2Name',
    picture: 'test2.png',
    birthday: '2021-06-20',
    gender: 'Male',
    address: 'test2',
    geocode: 'ST_PointFromText(\'POINT(0 0)\',3857)',
    native: 'zh-TW',
    learning: 'en-US',
    introduction: 'test2',
    interest: 'Cycling',
    token: 'testToken2'
  }
]

module.exports = {
  users
}
