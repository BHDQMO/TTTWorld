require('dotenv').config()
const { pool } = require('../server/models/mysqlcon')
const { users } = require('./fake_data')

const { NODE_ENV } = process.env

async function truncateFakeData() {
  if (NODE_ENV !== 'test') {
    console.log('Not in test env')
    return
  }

  const truncateTable = async (table) => {
    const conn = await pool.getConnection()
    await conn.query('START TRANSACTION')
    await conn.query('SET FOREIGN_KEY_CHECKS = ?', 0)
    await conn.query(`TRUNCATE TABLE ${table}`)
    await conn.query('SET FOREIGN_KEY_CHECKS = ?', 1)
    await conn.query('COMMIT')
    await conn.release()
  }

  const tables = ['exchange', 'exchange_collect', 'favorite', 'friend', 'history', 'interest', 'room', 'user']
  await Promise.all(tables.map((table) => truncateTable(table)))
}

async function createFakeData() {
  if (NODE_ENV !== 'test') {
    console.log('Not in test env')
  }
}

module.exports = {
  truncateFakeData,
  createFakeData
}
