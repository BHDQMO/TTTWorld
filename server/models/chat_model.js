// const { bind } = require("lodash")
const { ComputeOptimizer } = require('aws-sdk');
const { CostExplorer } = require('aws-sdk');
const { bind } = require('lodash');
const {
  mysql,
  query,
  transaction,
  commit,
  rollback
} = require('./mysqlcon');

async function createRoom(invite) {
  console.log(invite)
  queryString = `
  INSERT INTO room (user_a, user_b)
  SELECT * FROM (SELECT ?) AS temp
  WHERE NOT EXISTS
  (
    SELECT * FROM room WHERE user_a = ? AND user_b = ? 
    OR user_b = ? AND user_a = ?
  )
  `
  binding = [invite]
  invite.concat(invite).flat().map(i => binding.push(i))
  console.log(binding)
  const result = await query(queryString, binding)
  console.log(result)
  return result.insertId
}

const getFriendList = async (user_id) => {
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
  const result = await query(queryString, [user_id, user_id])
  return result
}

// const getFriendIdList = async (user_id) => {
//   const queryString = `
//   SELECT * FROM 
//   ( 
//     SELECT receiver_id AS user_id FROM friend WHERE status = 'Let\\'s Chat' AND sender_id = ?
//     UNION
//     SELECT sender_id AS user_id FROM friend WHERE status = 'Let\\'s Chat' AND receiver_id = ?
//   ) AS friend_list
// `
//   const result = await query(queryString, [user_id, user_id])
//   return result
// }

const addFavorite = async (data) => {
  let binding = Object.values(data)
  binding = [binding, binding].flat()
  const queryString = `
  INSERT INTO favorite (user_id, history_id) 
  SELECT ?, ?
  WHERE NOT EXISTS 
  (SELECT * FROM favorite WHERE user_id = ? AND history_id = ?)
  `
  const result = await query(queryString, binding)
  return result
}


const getRooms = async (user_id) => {
  const queryString = `
  SELECT user_a AS user_id, id AS room_id FROM room WHERE user_b = ?
  UNION
  SELECT user_b AS user_id, id AS room_id FROM room WHERE user_a = ?
  `
  const result = await query(queryString, [user_id, user_id])
  return result
}

const getHistory = async (room) => {
  const queryString = `SELECT *  FROM history WHERE room = ?`
  const result = await query(queryString, room)
  return result
}

const saveMessage = async (msg) => {
  await transaction()
  try {
    const result = await query(`INSERT INTO history SET ?`, msg)
    const historyId = result.insertId
    const timeStamp = await query(`SELECT time FROM history WHERE id = ?`, [historyId])
    await commit()
    return { time: timeStamp[0].time, historyId }
  } catch (error) {
    rollback()
    return error
  }
}

const readMessage = async (data) => {
  console.log(data)
  const queryString = `
  UPDATE history SET \`read\` = 1 WHERE sender = ? AND room = ? AND \`read\` = 0
  `
  const result = await query(queryString, data)
  return result
}

const createExchange = async (exchange) => {
  const result = await query(`INSERT INTO exchange SET ?`, exchange)
  return result.insertId
}

const updateExchangeStatus = async (exchange_id, status) => {
  let queryString = `UPDATE exchange SET status = ? WHERE id = ?`
  const result = await query(queryString, [status, exchange_id])

  return result
}

const exchangeStart = async (exchange, status) => {
  try {
    await transaction()
    let binding = [exchange.room_id, exchange.publisher_id, 'exchange', exchange.id]
    let queryString = `
    INSERT INTO history (room,sender,\`type\`)
    SELECT ?,?,?
    WHERE NOT EXISTS 
    (SELECT * FROM \`exchange\` WHERE id = ? AND history_id IS NOT NULL)`
    let result = await query(queryString, binding)
    const history_id = result.insertId

    if (history_id) {
      const exchange_id = exchange.id
      binding = [status, history_id, exchange_id]
      queryString = `UPDATE exchange SET status = ? , history_id = ? WHERE id = ?`
      await query(queryString, binding)
      queryString = `SELECT * FROM history WHERE id = ?`
      result = await query(queryString, history_id)
    }

    await commit()
    return result[0]
  } catch (error) {
    await rollback()
    console.log(error)
    return error
  }
}

const updateExchangeRead = async (exchange_id) => {
  const queryString = `UPDATE exchange SET \`read\` = 1 WHERE id = ?`
  const result = await query(queryString, [exchange_id])
  return result
}

const removeExchange = async (exchange_id) => {
  const result = await query(`DELETE FROM exchange WHERE id = ?`, [exchange_id])
  return result
}

const getUnreadMsgNum = async (roomList) => {
  const queryString = `
  SELECT sender, COUNT(*) AS unread 
  FROM history 
  WHERE \`read\` = 0 AND sender <> 35 AND room IN (11,12,13,14)
  GROUP BY sender
  `
  const result = await query(queryString, roomList)
  return result
}

const updateTranslate = async (historyId, translateResult) => {
  const queryString = `UPDATE history SET translate = ? WHERE id = ?`
  const result = await query(queryString, [translateResult, historyId])
  return result
}

const getTranslate = async (historyId) => {
  const queryString = `SELECT translate FROM history WHERE id = ?`
  const result = await query(queryString, [historyId])
  return result[0].translate
}

const saveCollect = async (collection) => {
  const queryString = `INSERT INTO exchange_collect SET ?`
  const result = await query(queryString, collection)
  return result
}

module.exports = {
  createRoom,
  getFriendList,
  // getFriendIdList,
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

// function () {
//   await transaction()
//   try{
//     await query()
//     await commit()
//   }catch(error){
//     rollback()
//     return error
//   }
// }