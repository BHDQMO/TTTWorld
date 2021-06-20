const { assert, requester } = require('./set_up')
const { users } = require('./fake_data')

const { S3_OBJECT_URL } = process.env

const signupUser = {
  provider: 'native',
  email: 'test@test.com',
  password: 'test',
  name: 'test',
  picture: '51141d3f.png',
  birthday: '2021-06-20',
  gender: 'Male',
  address: 'taiwan',
  native: 'zh-TW',
  learning: 'en-US',
  introduction: 'test',
  interest: 'Cycling'
}

describe('user', () => {
  it('sign up', async function () {
    this.timeout(2500)

    const res = await requester
      .post('/user/signup')
      .send(signupUser)

    const { data } = res.body

    const userExpect = {
      user_id: data.user.user_id,
      provider: signupUser.provider,
      name: signupUser.name,
      email: signupUser.email,
      picture: `${S3_OBJECT_URL}/${signupUser.picture}`
    }

    assert.deepEqual(data.user, userExpect)
    assert.isString(data.token)
  })

  it('sign up without name or email or password', async () => {
    const user1 = { ...signupUser }
    delete user1.name

    const res1 = await requester
      .post('/user/signup')
      .send(user1)

    assert.equal(res1.statusCode, 400)

    const user2 = { ...signupUser }
    delete user2.email

    const res2 = await requester
      .post('/user/signup')
      .send(user2)

    assert.equal(res2.statusCode, 400)

    const user3 = { ...signupUser }
    delete user3.password

    const res3 = await requester
      .post('/user/signup')
      .send(user3)

    assert.equal(res3.statusCode, 400)
  })

  it('sign up with existed email', async () => {
    await requester
      .post('/user/signup')
      .send(signupUser)

    const res = await requester
      .post('/user/signup')
      .send(signupUser)
    console.log(signupUser)
    console.log(res.body)
    assert.equal(res.body.error, 'Email Already Exists')
  })

  it('sign up with malicious email', async () => {
    const user = { ...signupUser }
    user.email = '<script>alert(1)</script>'
    console.log(user)
    const res = await requester
      .post('/user/signup')
      .send(user)
    console.log(res.body)
    assert.equal(res.body.error, 'Request Error: Invalid email format')
  })
})
