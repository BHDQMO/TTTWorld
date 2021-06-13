require('dotenv').config()

const path = require('path')
const fs = require('fs')

const cors = require('cors')
const express = require('express')
const app = express()

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'))

const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server)

const { serverNotice } = require("./util/util")
const Socket = require("./util/socket")
const port = process.env.PORT

// for server noticing
setInterval(() => serverNotice(io), 1000)


// Api Main Route
app.use('/',
  [
    require('./server/routes/user_route'),
    require('./server/routes/chat_route'),
    require('./server/routes/explore_route'),
    require('./server/routes/google_route')
  ]
)

// Page not found
app.use(function (req, res, next) {
  res.status(404).sendFile(path.join(__dirname, '/public/404.html'))
})

// Error handling
app.use(function (err, req, res, next) {
  console.log(err)
  res.status(500).send('Internal Server Error')
})

const onConnect = (socket, next) => {
  Socket.sendWaitingInvite(socket, io)
  socket.on("signin", Socket.onlineNotice(socket, io));
  socket.on("readInvite", Socket.readInvite(socket, io));

  socket.on("joinRoom", Socket.joinRoom(socket, io));
  socket.on("leaveRoom", Socket.leaveRoom(socket, io));

  // for peer to peer communicate
  socket.on("offer", Socket.offer(socket, io));
  socket.on("answer", Socket.answer(socket, io));
  socket.on("icecandidate", Socket.icecandidate(socket, io));

  // for calling
  socket.on("hangup", Socket.hangup(socket, io));
  socket.on("callend", Socket.callend(socket, io));

  socket.on('message', Socket.message(socket, io))
  socket.on('readMessage', Socket.readMessage(socket, io))
  socket.on('favorite', Socket.favorite(socket, io))

  socket.on('exchangeInvite', Socket.exchangeInvite(socket, io))
  socket.on('acceptExchangeInvite', Socket.acceptExchangeInvite(socket, io))
  socket.on('rejectExchangeInvite', Socket.rejectExchangeInvite(socket, io))
  socket.on('readExchangeInviteAnswer', Socket.readExchangeInviteAnswer(socket, io))

  socket.on('readyToStart', Socket.readyToStart(socket, io))
  socket.on('saveCollect', Socket.saveCollect(socket, io))

  socket.on('invite', Socket.invite(socket, io))
  socket.on('accept', Socket.accept(socket, io))
  socket.on('reject', Socket.reject(socket, io))
}

io.use(Socket.login)
io.on("connect", onConnect);

server.listen(port, () => {
  console.log(`listening on ${port}`)
})

module.exports = app

