require('dotenv').config()
const mysql = require('mysql2/promise')

const {
  NODE_ENV,
  DB_HOST_LOCAL,
  DB_USERNAME_LOCAL,
  DB_PASSWORD_LOCAL,
  DB_DATABASE_LOCAL,
  DB_HOST_RDS,
  DB_USERNAME_RDS,
  DB_PASSWORD_RDS,
  DB_DATABASE_RDS,
  DB_CONNECTION_LIMIT
} = process.env

const mysqlConfig = {
  production: {
    host: DB_HOST_RDS,
    user: DB_USERNAME_RDS,
    password: DB_PASSWORD_RDS,
    database: DB_DATABASE_RDS
  },
  development: { // for localhost development
    host: DB_HOST_LOCAL,
    user: DB_USERNAME_LOCAL,
    password: DB_PASSWORD_LOCAL,
    database: DB_DATABASE_LOCAL
  }
  // test: { // for automation testing (command: npm run test)
  //   host: DB_HOST,
  //   user: DB_USERNAME,
  //   password: DB_PASSWORD,
  //   database: DB_DATABASE_TEST
  // }
}

const env = NODE_ENV || 'production'
const mysqlEnv = mysqlConfig[env]
mysqlEnv.waitForConnections = true
mysqlEnv.connectionLimit = parseInt(DB_CONNECTION_LIMIT)
const pool = mysql.createPool(mysqlEnv)

module.exports = {
  pool
}
