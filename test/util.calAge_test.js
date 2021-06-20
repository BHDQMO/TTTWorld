// const assert = require('assert')
const { expect } = require('chai')
const { calAge } = require('../util/util')

describe('the calAge function', () => {
  it('should be 0 if the input date is in the future', () => {
    const result = calAge('2035-10-10')
    expect(result).to.be.eq(0)
  })
})
