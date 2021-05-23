const Explore = require('../server/models/explore_model')
const Chat = require('../server/models/chat_model')

const Room1 = 'general'
const users = {
  [Room1]: {},
};

const joinRoom = (socket, io) => ({ username, room = Room1 }) => {
  socket.join(room, () => {
    // push user for the suitable room
    users[room][socket.client.id] = { username: username, id: socket.client.id }
    // Notify all the users in the same room
    socket.broadcast.in(room).emit('joinRoom', users[room]);
  });
}

const leaveRoom = (socket, io) => ({ room, username }) => {
  socket.leave(room, () => {
    let usersRoom = users[room]
    delete users[room][socket.client.id]
    // usersRoom = usersRoom.filter((user) => (user.username !== username)) // delete user from the array
    socket.broadcast.in(room).emit('leaveRoom', usersRoom); // To all the users in the same room
  })
}

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

const message = (socket, io) => async (msg) => {
  const result = await Chat.saveMessage(msg)
  msg.time = result
  io.emit('message', msg)
}

const audioMessage = (socket, io) => (blob) => {
  io.emit('audioMessage', blob)
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

module.exports = {
  joinRoom,
  leaveRoom,
  offer,
  answer,
  icecandidate,
  message,
  // textMessage,
  audioMessage,
  invite,
  accept,
  reject
}


