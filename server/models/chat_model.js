// const { bind } = require("lodash")
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
  const result = await query(queryString, binding)
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
    SELECT user_id,name,native,learning,picture,interest FROM user
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
    const timeStamp = await query(`SELECT time FROM history WHERE id = ?`, [result.insertId])
    await commit()
    return timeStamp[0].time
  } catch (error) {
    rollback()
    return error
  }
}

const createExchange = async (exchange) => {
  const result = await query(`INSERT INTO exchange SET ?`, exchange)
  console.log(result)
  return result.insertId
}

module.exports = {
  createRoom,
  getFriendList,
  // getFriendIdList,
  getRooms,
  getHistory,
  saveMessage,
  createExchange
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