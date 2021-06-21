require('dotenv').config()
const { pool } = require('../server/models/mysqlcon')
const { users, friends } = require('./fake_data')

const { NODE_ENV } = process.env

async function createFakeUser() {
  const geocodeAndEmail = users.map((x) => [x.geocode, x.email])
  const usersSubAddress = users.map((x) => { delete x.geocode; return x })
  const columnNames = Object.keys(usersSubAddress[0]).reduce((acc, cur) => `${acc},${cur}`)

  let string = `INSERT INTO user (${columnNames}) VALUES ?`
  await pool.query(string, [usersSubAddress.map((x) => Object.values(x))])
  geocodeAndEmail.forEach(async (x) => {
    string = 'UPDATE user SET geocode = ST_PointFromText(?,3857) WHERE email = ?'
    await pool.query(string, x)
  })
}

async function createFakeFriend() {
  const string = 'INSERT INTO friend SET ?'
  await pool.query(string, friends)
}

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
  await createFakeUser()
  await createFakeFriend()
}

module.exports = {
  truncateFakeData,
  createFakeData
}
