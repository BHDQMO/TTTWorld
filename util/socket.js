const Explore = require('../server/models/explore_model')
const Chat = require('../server/models/chat_model')

let socket_ids = {}

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
  next()
}

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
  io.to(socket.id).emit('signin');
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

  const waitingInvite = await Explore.getWaitingInvite(invite[1])
  let unreadNum = 0
  waitingInvite.map(invite => {
    if (invite.read === 0) { unreadNum++ }
  })
  const data = {
    unreadNum,
    waitingInvite
  }
  io.to(socket_ids[invite[1]]).emit('waitingInvite', data)
};

const accept = (socket, io) => async (invite) => {
  await Explore.acceptInvite(invite)
  const room = await Chat.createRoom(invite)
  socket.emit('accept', room)
};

const reject = (socket, io) => async (invite) => {
  await Explore.rejectInvite(invite)
};

const icecandidate = (socket, io) => ({ room, candidate }) => {
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
  const room = data.room
  console.log('switch offer')
  socket.to(room).emit('offer', data);
}

const answer = (socket, io) => (data) => {
  console.log('switch answer')
  socket.to(data.room).emit('answer', data);
}

const aheadExchangeNotice = ({ io, exchangeList }) => {
  console.log(exchangeList)
  Object.entries(exchangeList).map(exchange => {
    exchange[1].userList.map(user => {
      console.log('emit aheadExchangeNotice event')
      io.to(socket_ids[user]).emit('aheadExchangeNotice', exchange[1]);
    })
  })
}

const exchangeStartNotice = ({ io, exchangeList }) => {
  Object.entries(exchangeList).map(exchange => {
    exchange[1].userList.map(user => {
      console.log('emit exchangeStartNotice event')
      io.to(socket_ids[user]).emit('exchangeStartNotice', exchange[1]);
    })
  })
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
  aheadExchangeNotice,
  exchangeStartNotice
}


