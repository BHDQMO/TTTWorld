const Explore = require('../server/models/explore_model')
const Chat = require('../server/models/chat_model')
const { constant } = require('lodash')

let socket_ids = {}
let online_user = {}
// let meeting_room_ids = {
//   meeting_room_id : [user_id]
// }

// socket.on("joinMeetingRoom",({user_id,meeting_room_id})=>{
//   meeting_room_ids[meeting_room_id].push(user_id)
// })

const login = (socket, next) => {
  const user_id = socket.handshake.auth.user_id
  socket.user_id = user_id
  socket_ids[user_id] = socket.id
  // online_user[user_id] = {
  //   socket_id: socket.id
  // }
  // console.log(online_user)
  next()
}

//once user online, send waiting invite to them
const sendWaitingInvite = async (socket, io) => {
  const waitingInvite = await Explore.getWaitingInvite(socket.user_id)
  let unreadNum = 0
  waitingInvite.map(invite => {
    if (invite.read === 0) { unreadNum++ }
  })
  const data = {
    unreadNum,
    waitingInvite
  }
  io.to(socket.id).emit('waitingInvite', data)
}

const readInvite = (socket, io) => async (user_id) => {
  const result = await Explore.readInvite(socket.user_id)
}

const onlineNotice = (socket, io) => async (user) => {
  const friendList = await Chat.getFriendList(user.user_id)
  const roomList = await Chat.getRooms(user.user_id)
  const roomPair = {}
  roomList.map(room => roomPair[room.user_id] = room.room_id)
  friendList.map(friend => {
    const friend_id = friend.user_id
    const friend_socket_id = socket_ids[friend_id]
    if (friend_socket_id) {
      user.room_id = roomPair[friend_id]
      io.to(friend_socket_id).emit('friend_online', user);
    }
  })
}

// socket_ids[socket_ids.handshack.auth.user_id] = socket.id
// console.log(socket_ids)

const joinRoom = (socket, io) => async ({ user_id, room }) => {
  socket.join(room)
  io.to(room).emit('joinRoom', { user_id, room });
  // socket.to(room).emit('online'); //to other
}

const leaveRoom = (socket, io) => async ({ user_id, room }) => {
  socket.leave(room)
  io.to(room).emit('leaveRoom', user_id);
  // socket.to(room).emit('offline');
}

const message = (socket, io) => async (data) => {
  const msg = data.msg
  const result = await Chat.saveMessage(msg)
  msg.time = result.time
  msg.id = result.historyId
  console.log(msg)
  io.to(msg.room).emit('message', msg)
  console.log(io.sockets.adapter.rooms)
  try {
    if (!io.sockets.adapter.rooms.get(msg.room).has(socket_ids[data.receiver])) {
      io.to(socket_ids[data.receiver]).emit('message', msg)
    }
  } catch (e) {
    console.log("can't find the room num in sever list")
  }
}

const readMessage = (socket, io) => async (data) => {
  const result = await Chat.readMessage(data)
}

const favorite = (socket, io) => async (data) => {
  const result = await Chat.addFavorite(data)
}

const invite = (socket, io) => async (invite) => {
  await Explore.createInvite(invite)
  io.to(socket_ids[invite[0]]).emit('invite', invite[1])
  //send back to sender

  //get the receiver's waiting invite and calc. unread number
  const waitingInvite = await Explore.getWaitingInvite(invite[1])
  let unreadNum = 0
  waitingInvite.map(invite => {
    if (invite.read === 0) { unreadNum++ }
  })
  const data = {
    unreadNum,
    waitingInvite
  }
  //inform to receiver 
  io.to(socket_ids[invite[1]]).emit('waitingInvite', data)
};

const accept = (socket, io) => async ({ user, sender_Id }) => {
  console.log([user.user_id, sender_Id])
  await Explore.acceptInvite([user.user_id, sender_Id])
  const room = await Chat.createRoom([user.user_id, sender_Id])
  console.log(room)
  io.to(socket_ids[user.user_id]).emit('accept', room)
  io.to(socket_ids[sender_Id]).emit('inviteAccepted', { user, room })
};

const reject = (socket, io) => async (invite) => {
  await Explore.rejectInvite(invite)
  io.to(socket_ids[invite[1]]).emit('reject', invite[0])
};

const icecandidate = (socket, io) => ({ room, candidate }) => {
  // const hasCandidates = online_user[socket.user_id].candidates
  // if (hasCandidates) {
  //   online_user[socket.user_id].candidates.push(candidate)
  // } else {
  //   online_user[socket.user_id].candidates = [candidate]
  // }
  // console.log(online_user)
  console.log('switch icecandidate')
  socket.to(room).emit('icecandidate', { room, candidate });
}

const hangup = (socket, io) => (data) => {
  console.log('hang up the phone')
  socket.to(data.room).emit('hangup', data);
}

const callend = (socket, io) => (room_id) => {
  console.log('call end')
  socket.to(room_id).emit('callend');
}

const offer = (socket, io) => (data) => {
  // online_user[socket.user_id].offer = data.offer
  const room = data.room
  console.log('switch offer')
  socket.to(room).emit('offer', data);
}

const answer = (socket, io) => (data) => {
  console.log('switch answer')
  socket.to(data.room).emit('answer', data);
}

const beforeStartNotice = (io, data) => {
  const exchange = data.exchange
  userList = [exchange.user_a, exchange.user_b]
  userList.map(user => {
    if (socket_ids[user]) {
      const invite = {
        exchangeInvite: exchange,
        sender: data.user[userList.find(x => x !== user)]
      }
      io.to(socket_ids[user]).emit('beforeExchangeStart', invite)
    }
  })
}

const checkExchangeReady = {}
const onStartNotice = (io, data) => {
  const exchange = data.exchange
  userList = [exchange.user_a, exchange.user_b]
  if (!checkExchangeReady[exchange.id]) {
    checkExchangeReady[exchange.id] = {}
    checkExchangeReady[exchange.id][exchange.user_a] = false
    checkExchangeReady[exchange.id][exchange.user_b] = false
  }
  userList.map(user => {
    if (socket_ids[user]) {
      const invite = {
        exchangeInvite: exchange,
        sender: data.user[userList.find(x => x !== user)]
      }
      io.to(socket_ids[user]).emit('exchangePreStart', invite)
    }
  })
}

const readyToStart = (socket, io) => ({ user_id, exchange }) => {
  const exchange_id = exchange.id
  if (checkExchangeReady[exchange_id]) {
    checkExchangeReady[exchange_id][user_id] = true
  }
  const exchangeReadyStatus = Object.values(checkExchangeReady[exchange_id]).filter(x => x === true).length
  if (exchangeReadyStatus === 2) {
    Object.keys(checkExchangeReady[exchange_id]).map(async user => {
      io.to(socket_ids[user]).emit('exchangeStart', { exchange_id, startExchangeTime: new Date() })
      // insert this exchange into history
      // update exchange status to 3, means this exchage has started
      await Chat.exchangeStart(exchange, 3)
    })
    io.to(socket_ids[user_id]).emit('triggerExchange')
  }
}

const saveCollect = (socket, io) => (collection) => {
  console.log(collection)
  collection.map(async data => {
    const result = await Chat.saveCollect(data)
    console.log(result)
  })
}

const exchangeInvite = (socket, io) => async (package) => {
  const receiver = package.receiver
  const data = package.data
  const exchange_id = await Chat.createExchange(data.exchangeInvite)
  data.exchangeInvite.exchange_id = exchange_id
  if (socket_ids[receiver]) {
    io.to(socket_ids[receiver]).emit('exchangeInvite', [data])
  }
}

const acceptExchangeInvite = (socket, io) => async (answer) => {
  const result = await Chat.updateExchangeStatus(answer.exchange_id, 1)
  const publisherSocketId = socket_ids[answer.exchangeInvite.publisher_id]
  console.log(publisherSocketId)
  console.log(answer)
  if (publisherSocketId) {
    io.to(publisherSocketId).emit('exchangeInviteAccepted', answer)
  }
}

const rejectExchangeInvite = (socket, io) => async (answer) => {
  const result = await Chat.updateExchangeStatus(answer.exchange_id, 1)
  const publisherSocketId = socket_ids[answer.exchangeInvite.publisher_id]
  if (publisherSocketId) {
    io.to(publisherSocketId).emit('exchangeInviteRejected', answer)
  }
}

const readExchangeInviteAnswer = (socket, io) => async (exchange_id) => {
  const result = await Chat.updateExchangeRead(exchange_id)
}

module.exports = {
  login,
  sendWaitingInvite,
  onlineNotice,
  readInvite,
  joinRoom,
  leaveRoom,
  offer,
  answer,
  icecandidate,
  hangup,
  callend,
  message,
  favorite,
  readMessage,
  invite,
  accept,
  reject,
  beforeStartNotice,
  onStartNotice,
  readyToStart,
  saveCollect,
  exchangeInvite,
  acceptExchangeInvite,
  rejectExchangeInvite,
  readExchangeInviteAnswer,
}


