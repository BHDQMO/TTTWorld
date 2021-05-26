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

const friendOnline = async (socket, io) => {
  const user_id = socket.user_id
  const friendList = await Chat.getFriendList(user_id)
  io.to(socket.id).emit('friend_data', { friendList: friendList });

  friendIdList = friendList.map(friend => friend.user_Id)
  friendList.map(friend => {
    const friend_id = friend.user_id
    const friend_socket_id = socket_ids[friend_id]
    if (friend_socket_id) {
      io.to(friend_socket_id).emit('friend_online', { friend_id: user_id });
    }
  })
}

// socket_ids[socket_ids.handshack.auth.user_id] = socket.id
// console.log(socket_ids)

const joinRoom = (socket, io) => async ({ userId, room }) => {
  socket.join(room)
  io.to(room).emit('joinRoom', { userId, room });
  // console.log(await io.sockets.adapter.rooms)
  // socket.to(room).emit('online'); //to other
}

const leaveRoom = (socket, io) => async ({ userId, room }) => {
  socket.leave(room)
  io.to(room).emit('leaveRoom', userId);
  // socket.to(room).emit('offline');
}

const message = (socket, io) => async (msg) => {
  const result = await Chat.saveMessage(msg)
  msg.time = result
  io.to(msg.room).emit('message', msg)
}

const invite = (socket, io) => async (invite) => {
  await Explore.createInvite(invite)
  socket.emit('invite', invite[1])
};

const accept = (socket, io) => async (invite) => {
  await Explore.acceptInvite(invite)
  const room = await Chat.createRoom(invite)
  socket.emit('accept', room)
};

const reject = (socket, io) => async (invite) => {
  await Explore.rejectInvite(invite)
};

const offer = (socket, io) => ({ room, offer }) => {
  console.log('switch offer')
  socket.broadcast.in(room).emit('offer', offer);
}

const answer = (socket, io) => ({ room, answer }) => {
  console.log('switch answer')
  socket.broadcast.in(room).emit('answer', answer);
}

const icecandidate = (socket, io) => ({ room, candidate }) => {
  console.log('switch icecandidate')
  socket.broadcast.in(room).emit('icecandidate', candidate);
}

module.exports = {
  login,
  friendOnline,
  joinRoom,
  leaveRoom,
  offer,
  answer,
  icecandidate,
  message,
  invite,
  accept,
  reject,
}


