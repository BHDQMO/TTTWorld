const io = require('socket.io-client')
const { users } = require('./fake_data')
const { assert, requester } = require('./set_up')

const { TEST_PORT } = process.env
const socketURL = `http://localhost:${TEST_PORT}`
const options = {
  transports: ['websocket'],
  'force new connection': true
}

describe('socket service', () => {
  it('Should attach user_id with the connect', (done) => {
    const { socketIds } = require('../util/socket')
    const optionsWithAuth = { ...options }
    optionsWithAuth.auth = { user_id: 'testUserId' }
    io(socketURL, optionsWithAuth)
    setTimeout(() => {
      assert.isString(socketIds.testUserId)
      done()
    }, 20)
  })

  it('Should receive waiting friend and exchange invitation ', (done) => {
    const optionsWithAuth = { ...options }
    optionsWithAuth.auth = { user_id: users[0].user_id }
    const client = io(socketURL, optionsWithAuth)
    client.on('waitingInvite', (data) => {
      assert.isArray(data.waitingInvite)
      assert.isArray(data.waitingExchangeInvite)
      done()
    })
  })
})
