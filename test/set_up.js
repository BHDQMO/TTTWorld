require('dotenv').config()
const chai = require('chai')
const chaiHttp = require('chai-http')
const app = require('../app')
const { truncateFakeData, createFakeData } = require('./fake_data_generator')

chai.use(chaiHttp)

const { NODE_ENV } = process.env
const { assert } = chai
const requester = chai.request(app).keepOpen()

before(async function () {
  this.timeout(5000)

  if (NODE_ENV !== 'test') {
    throw new Error('Not in test env')
  }
  await truncateFakeData()
  // await createFakeData()
})

module.exports = {
  assert,
  requester
}
