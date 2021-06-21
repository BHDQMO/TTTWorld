require('dotenv').config()
const chai = require('chai')
const chaiHttp = require('chai-http')
const server = require('../app') // require app from another file, so require.main === module will be false, so will not listen to 3000
const { truncateFakeData, createFakeData } = require('./fake_data_generator')

chai.use(chaiHttp)

const { NODE_ENV, TEST_PORT } = process.env
const { assert } = chai

// Start server for testing, listen for test port
server.listen(TEST_PORT, () => {
  console.log(`start test server at port ${TEST_PORT}`)
})

// directly call app, so will lisent to 3000
const requester = chai.request(server).keepOpen()

before(async function () {
  this.timeout(5000)

  if (NODE_ENV !== 'test') {
    throw new Error('Not in test env')
  }
  await truncateFakeData()
  await createFakeData()
})

module.exports = {
  assert,
  requester
}
