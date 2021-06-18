const { pool } = require('./mysqlcon')

async function createRoom(invite) {
  const queryString = `
  INSERT INTO room (user_a, user_b)
  SELECT * FROM (SELECT ?) AS temp
  WHERE NOT EXISTS
  (
    SELECT * FROM room WHERE user_a = ? AND user_b = ? 
    OR user_b = ? AND user_a = ?
  )
  `
  const binding = [invite]
  invite.concat(invite).flat().map((i) => binding.push(i))
  const [result] = await pool.query(queryString, binding)
  return result.insertId
}

const getFriendList = async (userId) => {
  const queryString = `
  SELECT * FROM 
  ( 
    SELECT receiver_id AS user_id FROM friend WHERE status = 'Let\\'s Chat' AND sender_id = ?
    UNION
    SELECT sender_id AS user_id FROM friend WHERE status = 'Let\\'s Chat' AND receiver_id = ?
  ) AS friend_list
  LEFT JOIN 
  ( 
    SELECT user_id,name,native,learning,picture,interest,email,introduction FROM user
  ) AS user_data
  ON friend_list.user_id = user_data.user_id 
  `
  const [result] = await pool.query(queryString, [userId, userId])
  return result
}

const addFavorite = async (data) => {
  let binding = Object.values(data)
  binding = [binding, binding].flat()
  const queryString = `
  INSERT INTO favorite (user_id, history_id) 
  SELECT ?, ?
  WHERE NOT EXISTS 
  (SELECT * FROM favorite WHERE user_id = ? AND history_id = ?)
  `
  const [result] = await pool.query(queryString, binding)
  return result
}

const getRooms = async (userId) => {
  const queryString = `
  SELECT user_a AS user_id, id AS room_id FROM room WHERE user_b = ?
  UNION
  SELECT user_b AS user_id, id AS room_id FROM room WHERE user_a = ?
  `
  const [result] = await pool.query(queryString, [userId, userId])
  return result
}

const getHistory = async (room) => {
  const queryString = 'SELECT *  FROM history WHERE room = ?'
  const [result] = await pool.query(queryString, room)
  return result
}

const saveMessage = async (msg) => {
  const conn = await pool.getConnection()
  await conn.query('START TRANSACTION')
  try {
    const result = await conn.query('INSERT INTO history SET ?', msg)
    const historyId = result.insertId
    const timeStamp = await conn.query('SELECT time FROM history WHERE id = ?', [historyId])
    await conn.query('COMMIT')
    return { time: timeStamp[0].time, historyId }
  } catch (error) {
    console.log(error)
    await conn.query('ROLLBACK')
    return error
  } finally {
    conn.release()
  }
}

const readMessage = async (data) => {
  const queryString = `
    UPDATE history SET \`read\` = 1 WHERE sender = ? AND room = ? AND \`read\` = 0
  `
  const [result] = await pool.query(queryString, data)
  return result
}

const createExchange = async (exchange) => {
  const [result] = await pool.query('INSERT INTO exchange SET ?', exchange)
  return result.insertId
}

const updateExchangeStatus = async (exchangeId, status) => {
  const queryString = 'UPDATE exchange SET status = ? WHERE id = ?'
  const [result] = await pool.query(queryString, [status, exchangeId])

  return result
}

const exchangeStart = async (exchange, status) => {
  const conn = await pool.getConnection()
  try {
    await conn.query('START TRANSACTION')
    let binding = [exchange.room_id, exchange.publisher_id, 'exchange', exchange.id]
    let queryString = `
    INSERT INTO history (room,sender,\`type\`)
    SELECT ?,?,?
    WHERE NOT EXISTS 
    (SELECT * FROM \`exchange\` WHERE id = ? AND history_id IS NOT NULL)`
    let result = await conn.query(queryString, binding)
    const historyId = result.insertId

    if (historyId) {
      const exchangeId = exchange.id
      binding = [status, historyId, exchangeId]
      queryString = 'UPDATE exchange SET status = ? , history_id = ? WHERE id = ?'
      await conn.query(queryString, binding)
      queryString = 'SELECT * FROM history WHERE id = ?'
      result = await conn.query(queryString, historyId)
    }

    await conn.query('COMMIT')
    return result[0]
  } catch (error) {
    console.log(error)
    await conn.query('ROLLBACK')
    console.log(error)
    return error
  } finally {
    conn.release()
  }
}

const updateExchangeRead = async (exchangeId) => {
  const queryString = 'UPDATE exchange SET `read` = 1 WHERE id = ?'
  const [result] = await pool.query(queryString, [exchangeId])
  return result
}

const removeExchange = async (exchangeId) => {
  const [result] = await pool.query('DELETE FROM exchange WHERE id = ?', [exchangeId])
  return result
}

const getUnreadMsgNum = async (roomList) => {
  const queryString = `
  SELECT sender, COUNT(*) AS unread 
  FROM history 
  WHERE \`read\` = 0 AND sender <> 35 AND room IN (11,12,13,14)
  GROUP BY sender
  `
  const [result] = await pool.query(queryString, roomList)
  return result
}

const updateTranslate = async (historyId, translateResult) => {
  const queryString = 'UPDATE history SET translate = ? WHERE id = ?'
  const [result] = await pool.query(queryString, [translateResult, historyId])
  return result
}

const getTranslate = async (historyId) => {
  const queryString = 'SELECT translate FROM history WHERE id = ?'
  const [result] = await pool.query(queryString, [historyId])
  return result[0].translate
}

const saveCollect = async (collection) => {
  const queryString = 'INSERT INTO exchange_collect SET ?'
  const [result] = await pool.query(queryString, collection)
  return result
}

module.exports = {
  createRoom,
  getFriendList,
  addFavorite,
  getRooms,
  getHistory,
  saveMessage,
  readMessage,
  createExchange,
  updateExchangeStatus,
  exchangeStart,
  updateExchangeRead,
  removeExchange,
  getUnreadMsgNum,
  updateTranslate,
  getTranslate,
  saveCollect
}
