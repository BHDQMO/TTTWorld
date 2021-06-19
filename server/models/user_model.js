const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { pool } = require('./mysqlcon')

const {
  TOKEN_SECRET
} = process.env

const signUp = async (user, interests) => {
  const conn = await pool.getConnection()
  try {
    await conn.query('START TRANSACTION')
    const { geocode } = user
    delete user.geocode

    const userQueryStr = 'INSERT INTO user SET ?'
    const [userResult] = await conn.query(userQueryStr, user)
    await conn.query(`UPDATE user SET geocode = ${geocode} WHERE email = '${user.email}'`)
    if (interests.length > 0) {
      interests.map(async (interest) => {
        const binding = [interest, interest]
        const interestQueryStr = 'INSERT INTO interest (name) SELECT * FROM (SELECT ?) AS temp WHERE NOT EXISTS ( SELECT name FROM interest WHERE name = ?)'
        await conn.query(interestQueryStr, binding)
      })
    }

    await conn.query('COMMIT')
    user.userId = userResult.insertId
    return user
  } catch (error) {
    console.log(error)
    await conn.query('ROLLBACK')
    return {
      error
    }
  } finally {
    conn.release()
  }
}

const isEmailExist = async (email) => {
  const [result] = await pool.query('SELECT email FROM user WHERE email = ? FOR UPDATE', [email])
  return result.length > 0
}

const nativeSignIn = async (email, password) => {
  const conn = await pool.getConnection()
  try {
    await conn.query('START TRANSACTION')
    const [[users]] = await conn.query('SELECT * FROM user WHERE email = ?', [email])

    if (users.length === 0) {
      return {
        error: 'This Email has not been registered'
      }
    }

    const user = users
    if (!bcrypt.compareSync(password, user.password)) {
      await conn.query('COMMIT')
      return {
        error: 'Password is wrong'
      }
    }

    const token = jwt.sign({
      provider: user.provider,
      name: user.name,
      email: user.email,
      picture: user.picture
    }, TOKEN_SECRET)

    const queryStr = 'UPDATE user SET token = ? WHERE user_id = ?'
    await conn.query(queryStr, [token, user.id])
    await conn.query('COMMIT')
    user.token = token
    return {
      user
    }
  } catch (error) {
    console.log(error)
    await conn.query('ROLLBACK')
    return {
      error
    }
  } finally {
    conn.release()
  }
}

const getUserDetail = async (email) => {
  const [[result]] = await pool.query('SELECT * FROM user WHERE email = ?', [email])
  return result
}

const getGroupDetail = async (group) => {
  const [result] = await pool.query('SELECT user_id,name,picture FROM user WHERE user_id IN (?)', [group])
  return result
}

const getFavorite = async (userId) => {
  const conn = await pool.getConnection()
  try {
    await conn.query('START TRANSACTION')
    let queryString = `
    SELECT * FROM
    (SELECT id AS favorite_id, history_id FROM favorite WHERE user_id = ?) AS favorite_list
    LEFT JOIN history
    ON favorite_list.history_id = history.id
    `
    let [favoriteData] = await conn.query(queryString, [userId])
    const collectedExchangeHistoryIds = []
    const sender = []
    const reply = []
    favoriteData = favoriteData.map((item) => {
      if (item.type === 'text') { // transfer blob to text
        item.content = item.content.toString()
      }
      if (sender.includes(item.sender) === false) {
        sender.push(item.sender)
      }
      if (item.reply) {
        reply.push(item.reply)
      }
      if (item.type === 'exchange') {
        collectedExchangeHistoryIds.push(item.id)
      }
      return item
    })

    const senderData = {}
    if (sender.length > 0) {
      queryString = 'SELECT user_id,name,picture FROM user WHERE user_id IN (?)'
      const [senderResult] = await conn.query(queryString, [sender])
      senderResult.forEach((result) => { senderData[result.user_id] = result })
    }

    const replyData = {}
    if (reply.length > 0) {
      queryString = 'SELECT * FROM history WHERE id IN (?)'
      let [replyResult] = await conn.query(queryString, [reply])
      replyResult = replyResult.map((item) => {
        if (item.type === 'text') {
          item.content = item.content.toString()
        }
        return item
      })
      replyResult.forEach((result) => { replyData[result.id] = result })
    }

    const collectionData = {}
    if (collectedExchangeHistoryIds.length > 0) {
      queryString = `
      SELECT * FROM
      (SELECT id AS exchange_id, history_id FROM \`exchange\` WHERE history_id IN ?) AS temp1 
      LEFT JOIN exchange_collect 
      ON temp1.exchange_id = exchange_collect.exchange_id
      `
      const [collectionResult] = await conn.query(queryString, [[collectedExchangeHistoryIds]])
      collectionResult.forEach((item) => {
        if (collectionData[item.history_id]) {
          collectionData[item.history_id].push(item)
        } else {
          collectionData[item.history_id] = [item]
        }
      })
    }

    const data = {
      favoriteData,
      senderData,
      replyData,
      collectionData
    }

    await conn.query('COMMIT')
    return data
  } catch (error) {
    console.log(error)
    await conn.query('ROLLBACK')
    return { error }
  } finally {
    conn.release()
  }
}

const getExchange = async (userId) => {
  const conn = await pool.getConnection()
  try {
    await conn.query('START TRANSACTION')
    let queryString = `
    SELECT * FROM 
    (
    SELECT id AS roomid FROM room WHERE user_a = ?
    UNION
    SELECT id AS roomid FROM room WHERE user_b = ?
    ) AS roomlist
    INNER JOIN
    \`exchange\` 
    ON roomlist.roomid = exchange.room_id
    `
    const [exchangeData] = await conn.query(queryString, [userId, userId])

    const roomList = []
    exchangeData.forEach((item) => {
      if (roomList.includes(item.room_id) === false) {
        roomList.push(item.room_id)
      }
    })

    const roommateData = {}
    if (roomList.length > 0) {
      queryString = `
    SELECT user.user_id, name, picture, room_id FROM 
    (SELECT user_a AS user_id, id AS room_id FROM room WHERE id IN ?
    UNION
    SELECT user_b AS user_id, id AS room_id FROM room WHERE id IN ?
    ) AS roommatelist
    LEFT JOIN user
    ON roommatelist.user_id = user.user_id
    WHERE user.user_id <> ?
    `
      const [roommateResult] = await conn.query(queryString, [[roomList], [roomList], userId])
      roommateResult.forEach((item) => { roommateData[item.room_id] = item })
    }
    const data = {
      exchangeData,
      roommateData
    }

    await conn.query('COMMIT')
    return data
  } catch (error) {
    console.log(error)
    await conn.query('ROLLBACK')
    return { error }
  } finally {
    conn.release()
  }
}

async function getWaitingNoticeExchange() {
  const conn = await pool.getConnection()
  try {
    await conn.query('START TRANSACTION')
    let queryString = `
    SELECT * FROM(
      SELECT * 
      FROM exchange
      LEFT JOIN(
        SELECT id AS waitNoticeList_id, TIMESTAMPDIFF(MINUTE,CURRENT_TIMESTAMP,start_time) AS remainTime 
        FROM exchange
      ) AS waitNoticeList
      ON exchange.id = waitNoticeList.waitNoticeList_id 
      WHERE remainTime <= 10 AND status = 1 AND notice IN (1,2)
    ) AS waitNoticeExchange
    LEFT JOIN (
      SELECT id AS room_id, user_a,user_b 
      FROM room
    ) AS room
    ON room.room_id = waitNoticeExchange.room_id
    `
    const [waitingNoticeExchange] = await conn.query(queryString)

    if (waitingNoticeExchange.length > 0) {
      // change the notice step by add 1
      const exchangeList = waitingNoticeExchange.map((exchange) => exchange.id)
      queryString = 'UPDATE exchange SET notice = notice + 1 WHERE id IN ?'
      await conn.query(queryString, [[exchangeList]])

      // instant case(remainTime<0) need to send onStartNotice immediately
      // so, change to 3 directly
      const instantExchange = waitingNoticeExchange.filter((x) => x.id < 0)

      queryString = 'UPDATE exchange SET notice = 3 WHERE id IN ?'
      await conn.query(queryString, [[instantExchange]])
    }

    await conn.query('COMMIT')
    return waitingNoticeExchange
  } catch (error) {
    console.log(error)
    await conn.query('ROLLBACK')
    return error
  } finally {
    conn.release()
  }
}

async function getUserListByRoom(roomList) {
  const queryString = `
    SELECT * FROM room WHERE id IN ?    
  `
  const [result] = await pool.query(queryString, [[roomList]])
  return result
}

module.exports = {
  isEmailExist,
  signUp,
  nativeSignIn,
  getUserDetail,
  getGroupDetail,
  getFavorite,
  getExchange,
  getWaitingNoticeExchange,
  getUserListByRoom
}
