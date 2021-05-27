const { ComputeOptimizer } = require('aws-sdk');
// const { bind } = require('lodash');
const {
  mysql,
  query,
  transaction,
  commit,
  rollback
} = require('./mysqlcon');

async function getUserList(user_id, sort, paging) {
  await transaction()
  try {
    const queryString = `
    SELECT 
      g2.*,
      ST_DISTANCE_SPHERE(g1.geocode,g2.geocode) / 1000 AS distance
    FROM
       ( SELECT geocode FROM user WHERE user_id = ?) AS g1,
       ( SELECT * FROM user WHERE user_id != ?) AS g2
    ORDER BY ${sort}
    LIMIT ?, 25`
    const binding = [user_id, user_id, paging * 25]
    let result = await query(queryString, binding)
    await commit()
    return result
  } catch (error) {
    await rollback()
    console.log(error)
    return { error }
  }
}

async function getFriendStatus(user, userIds) {

  queryString = `
  SELECT receiver_id, status FROM friend WHERE sender_id = ? AND receiver_id IN (?)`
  const sent = await query(queryString, [user, userIds])
  const sentPair = {}
  sent.map(invite => sentPair[invite.receiver_id] = invite.status)

  queryString2 = `
  SELECT sender_id, status FROM friend WHERE receiver_id = ? AND sender_id IN (?)`
  const received = await query(queryString2, [user, userIds])
  const receivedPair = {}
  received.map(invite => receivedPair[invite.sender_id] = invite.status)

  const initation = { sent: sentPair, received: receivedPair }
  // console.log(initation)
  return initation

}

async function getWaitingInvite(user_id) {
  queryString = `
  SELECT * FROM (
    SELECT sender_id AS user_id, \`read\` FROM friend WHERE status = 'Waiting' AND receiver_id = ? AND \`read\` = 0
  ) AS waiting_invite
  LEFT JOIN 
  (
    SELECT user_id, name, native, learning, picture FROM user
  ) AS user_temp
  ON waiting_invite.user_id = user_temp.user_id
  `
  const result = await query(queryString, [user_id])
  return result
}

async function readInvite(user_id) {
  queryString = `
  UPDATE friend SET \`read\` = 1 WHERE receiver_id = ? AND status = 'Waiting' 
  `
  const result = await query(queryString, [user_id])
  return result
}

async function getRooms(user, friendList) {
  const queryString = `
  SELECT * FROM 
  (
    SELECT user_b AS userId ,id AS roomId FROM room WHERE user_a = ? AND user_b IN (?)
    UNION
    SELECT user_a AS userId ,id AS roomId FROM room WHERE user_b = ? AND user_a IN (?)
  ) AS temp
  `
  const binding = [user, friendList, user, friendList]
  const result = await query(queryString, binding)
  const roomPair = {}
  result.map(room => roomPair[room.userId] = room.roomId)
  return roomPair
}

async function createInvite(invite) {
  console.log(invite)
  queryString = `INSERT INTO friend 
  (sender_id,receiver_id) SELECT * FROM (SELECT ?) AS temp 
  WHERE NOT EXISTS ( SELECT * FROM friend WHERE sender_id = ? AND receiver_id = ?)`
  const result = await query(queryString, [invite, invite[0], invite[1]])
  return result
}

async function acceptInvite(invite) {
  queryString = `
  UPDATE friend SET status = 'Let\\'s Chat' WHERE receiver_id = ? AND sender_id = ?`
  const result = await query(queryString, invite)
  return result
}

async function rejectInvite(invite) {
  queryString = `
  DELETE FROM friend WHERE receiver_id = ? AND sender_id = ?`
  const result = await query(queryString, invite)
  return result
}

module.exports = {
  getUserList,
  getFriendStatus,
  getWaitingInvite,
  readInvite,
  getRooms,
  createInvite,
  acceptInvite,
  rejectInvite
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