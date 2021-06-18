const { pool } = require('./mysqlcon')

async function getUserList(userId, sort, paging) {
  const conn = await pool.getConnection()
  try {
    await conn.query('START TRANSACTION')
    const queryString = `
    SELECT 
      g2.*,
      ST_DISTANCE_SPHERE(g1.geocode,g2.geocode) / 1000 AS distance
    FROM
       ( SELECT geocode FROM user WHERE user_id = ?) AS g1,
       ( SELECT * FROM user WHERE user_id != ?) AS g2
    ORDER BY ${sort}
    LIMIT ?, 25`
    const binding = [userId, userId, paging * 25]
    const [result] = await conn.query(queryString, binding)
    await conn.query('COMMIT')
    return result
  } catch (error) {
    console.log(error)
    await conn.query('ROLLBACK')
    return { error }
  } finally {
    conn.release()
  }
}

async function getFriendStatus(user, userIds) {
  const conn = await pool.getConnection()
  try {
    await conn.query('START TRANSACTION')
    let queryString = `
    SELECT receiver_id, status FROM friend WHERE sender_id = ? AND receiver_id IN (?)`
    const sent = await conn.query(queryString, [user, userIds])
    const sentPair = {}
    sent.forEach((invite) => { sentPair[invite.receiver_id] = invite.status })

    queryString = `
    SELECT sender_id, status FROM friend WHERE receiver_id = ? AND sender_id IN (?)`
    const received = await conn.query(queryString, [user, userIds])
    const receivedPair = {}
    received.forEach((invite) => { receivedPair[invite.sender_id] = invite.status })

    const initation = { sent: sentPair, received: receivedPair }
    await conn.query('COMMIT')
    return initation
  } catch (error) {
    await conn.query('ROLLBACK')
    console.log(error)
    return error
  } finally {
    conn.release()
  }
}

async function getWaitingInvite(userId) {
  const queryString = `
  SELECT * FROM (
    SELECT sender_id AS user_id, \`read\` FROM friend WHERE status = 'Waiting' AND receiver_id = ? AND \`read\` = 0
  ) AS waiting_invite
  LEFT JOIN 
  (
    SELECT user_id, name, native, learning, picture FROM user
  ) AS user_temp
  ON waiting_invite.user_id = user_temp.user_id
  `
  const [result] = await pool.query(queryString, [userId])
  return result
}

async function readInvite(userId) {
  const queryString = `
  UPDATE friend SET \`read\` = 1 WHERE receiver_id = ? AND status = 'Waiting' 
  `
  const [result] = await pool.query(queryString, [userId])
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
  const [result] = await pool.query(queryString, binding)
  const roomPair = {}
  result.forEach((room) => { roomPair[room.userId] = room.roomId })
  return roomPair
}

async function createInvite(invite) {
  const queryString = `INSERT INTO friend 
  (sender_id,receiver_id) SELECT * FROM (SELECT ?) AS temp 
  WHERE NOT EXISTS ( SELECT * FROM friend WHERE sender_id = ? AND receiver_id = ?)`
  const [result] = await pool.query(queryString, [invite, invite[0], invite[1]])
  return result
}

async function acceptInvite(invite) {
  const queryString = `
  UPDATE friend SET status = 'Let\\'s Chat' WHERE receiver_id = ? AND sender_id = ?`
  const [result] = await pool.query(queryString, invite)
  return result
}

async function rejectInvite(invite) {
  const queryString = `
  DELETE FROM friend WHERE receiver_id = ? AND sender_id = ?`
  const [result] = await pool.query(queryString, invite)
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
