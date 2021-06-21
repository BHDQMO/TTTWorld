/* eslint-disable no-unused-vars */
const Explore = require('../server/models/explore_model')
const Chat = require('../server/models/chat_model')

const socketIds = {}

const login = (socket, next) => {
  const userId = socket.handshake.auth.user_id
  socket.user_id = userId
  socketIds[userId] = socket.id
  next()
}

// once user online, send waiting invite to them
const sendWaitingInvite = async (socket, io) => {
  const waitingInvite = await Explore.getWaitingInvite(socket.user_id)
  const waitingExchangeInvite = await Explore.getWaitingExchangeInvite(socket.user_id)
  let unreadNum = 0
  waitingInvite.forEach((invite) => {
    if (invite.read === 0) { unreadNum += 1 }
  })
  const data = {
    unreadNum,
    waitingInvite,
    waitingExchangeInvite
  }
  io.to(socket.id).emit('waitingInvite', data)
}

const readInvite = (socket, io) => async () => {
  await Explore.readInvite(socket.user_id)
}

const onlineNotice = (socket, io) => async (user) => {
  const friend = await Chat.getFriendList(user.user_id)
  const roomsDetail = await Chat.getRooms(user.user_id)
  const roomDetail = {}
  roomsDetail.forEach((room) => { roomDetail[room.user_id] = room.room_id })
  friend.forEach((x) => {
    const friendId = x.user_id
    const friendSocketId = socketIds[friendId]
    if (friendSocketId) {
      user.room_id = roomDetail[friendId]
      io.to(friendSocketId).emit('friend_online', user)
    }
  })
}

const joinRoom = (socket, io) => async ({ userId, room }) => {
  socket.join(room)
  io.to(room).emit('joinRoom', { userId, room })
}

const leaveRoom = (socket, io) => async ({ userId, room }) => {
  socket.leave(room)
  io.to(room).emit('leaveRoom', userId)
}

const message = (socket, io) => async (data) => {
  const { msg } = data
  const result = await Chat.saveMessage(msg)
  msg.time = result.time
  msg.id = result.historyId
  io.to(msg.room).emit('message', msg)
  try {
    if (!io.sockets.adapter.rooms.get(msg.room).has(socketIds[data.receiver])) {
      io.to(socketIds[data.receiver]).emit('message', msg)
    }
  } catch (error) {
    console.log(error)// can't find the room num in sever list
  }
}

const readMessage = (socket, io) => async (data) => {
  await Chat.readMessage(data)
}

const savefavorite = (socket, io) => async (data) => {
  await Chat.savefavorite(data)
}

const createInvite = (socket, io) => async (invite) => {
  await Explore.createInvite(invite)
  io.to(socketIds[invite[0]]).emit('invite', invite[1])

  // get the receiver's waiting invite and calc. unread number
  const waitingInvite = await Explore.getWaitingInvite(invite[1])
  let unreadNum = 0
  waitingInvite.forEach((x) => {
    if (x.read === 0) { unreadNum += 1 }
  })
  const data = {
    unreadNum,
    waitingInvite
  }
  io.to(socketIds[invite[1]]).emit('waitingInvite', data)
}

const acceptInvite = (socket, io) => async ({ user, senderId }) => {
  await Explore.acceptInvite([user.user_id, senderId])
  const room = await Chat.createRoom([user.user_id, senderId])
  io.to(socketIds[user.user_id]).emit('accept', room)
  io.to(socketIds[senderId]).emit('inviteAccepted', { user, room })
}

const rejectInvite = (socket, io) => async (invite) => {
  await Explore.rejectInvite(invite)
  io.to(socketIds[invite[1]]).emit('reject', invite[0])
}

const iceCandidate = (socket, io) => ({ room, candidate }) => {
  socket.to(room).emit('icecandidate', { room, candidate })
}

const hangup = (socket, io) => (data) => {
  socket.to(data.room).emit('hangup', data)
}

const callend = (socket, io) => (roomId) => {
  socket.to(roomId).emit('callend')
}

const switchOffer = (socket, io) => (data) => {
  const { room } = data
  socket.to(room).emit('offer', data)
}

const switchAnswer = (socket, io) => (data) => {
  socket.to(data.room).emit('answer', data)
}

const noticeBeforeStart = (io, data) => {
  const { exchange } = data
  const userList = [exchange.user_a, exchange.user_b]
  userList.forEach((user) => {
    if (socketIds[user]) {
      const invite = {
        exchangeInvite: exchange,
        sender: data.user[userList.find((x) => x !== user)]
      }
      io.to(socketIds[user]).emit('beforeExchangeStart', invite)
    }
  })
}

const exchanges = {}
const noticeOnStart = (io, data) => {
  const { exchange } = data
  const userList = [exchange.user_a, exchange.user_b]
  if (!exchanges[exchange.id]) {
    exchanges[exchange.id] = {}
    exchanges[exchange.id][exchange.user_a] = false
    exchanges[exchange.id][exchange.user_b] = false
  }
  userList.forEach((user) => {
    if (socketIds[user]) {
      const invite = {
        exchangeInvite: exchange,
        sender: data.user[userList.find((x) => x !== user)]
      }
      io.to(socketIds[user]).emit('exchangePreStart', invite)
    }
  })
}

const sayReadyToStart = (socket, io) => async ({ userId, exchange }) => {
  const exchangeId = exchange.id
  if (exchanges[exchangeId]) {
    exchanges[exchangeId][userId] = true
  }
  const exchangeReadyStatus = Object.values(exchanges[exchangeId]).filter((x) => x === true).length
  if (exchangeReadyStatus === 2) {
    const exchangeHistory = await Chat.exchangeStart(exchange, 3)
    Object.keys(exchanges[exchangeId]).map(async (user) => {
      io.to(socketIds[user]).emit('exchangeStart', { exchangeId, startExchangeTime: new Date(), msg: exchangeHistory })
      // insert this exchange into history
      // update exchange status to 3, means this exchage has started
    })
    io.to(socketIds[userId]).emit('triggerExchange')
  }
}

const saveCollect = (socket, io) => (collection) => {
  collection.map(async (data) => {
    await Chat.saveCollect(data)
  })
}

const sendExchangeInvite = (socket, io) => async (invitation) => {
  const { receiver } = invitation
  const { data } = invitation
  const exchangeId = await Chat.createExchange(data.exchangeInvite)
  data.exchangeInvite.exchange_id = exchangeId
  if (socketIds[receiver]) {
    io.to(socketIds[receiver]).emit('exchangeInvite', [data])
  }
}

const acceptExchangeInvite = (socket, io) => async (resonse) => {
  await Chat.updateExchangeStatus(resonse.exchange_id, 1)
  const publisherSocketId = socketIds[resonse.exchangeInvite.publisher_id]
  if (publisherSocketId) {
    io.to(publisherSocketId).emit('exchangeInviteAccepted', resonse)
  }
}

const rejectExchangeInvite = (socket, io) => async (resonse) => {
  await Chat.updateExchangeStatus(resonse.exchange_id, 1)
  const publisherSocketId = socketIds[resonse.exchangeInvite.publisher_id]
  if (publisherSocketId) {
    io.to(publisherSocketId).emit('exchangeInviteRejected', resonse)
  }
}

const readExchangeInviteAnswer = (socket, io) => async (exchangeId) => {
  await Chat.updateExchangeRead(exchangeId)
}

module.exports = {
  socketIds,
  login,
  sendWaitingInvite,
  onlineNotice,
  readInvite,
  joinRoom,
  leaveRoom,
  switchOffer,
  switchAnswer,
  iceCandidate,
  hangup,
  callend,
  message,
  savefavorite,
  readMessage,
  createInvite,
  acceptInvite,
  rejectInvite,
  noticeBeforeStart,
  noticeOnStart,
  sayReadyToStart,
  saveCollect,
  sendExchangeInvite,
  acceptExchangeInvite,
  rejectExchangeInvite,
  readExchangeInviteAnswer
}
