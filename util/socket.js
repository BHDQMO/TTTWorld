const Explore = require('../server/models/explore_model')
const Chat = require('../server/models/chat_model')

const joinRoom = (socket, io) => async ({ userId, room }) => {
  socket.join(room)
  io.to(room).emit('joinRoom', { userId, room });
  console.log(await io.sockets.adapter.rooms)//to all
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
  console.log(msg)
  console.log(await io.sockets.adapter.rooms)
  io.to(msg.room).emit('message', msg)
  // io.emit('message', msg)
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
  joinRoom,
  leaveRoom,
  offer,
  answer,
  icecandidate,
  message,
  invite,
  accept,
  reject
}


