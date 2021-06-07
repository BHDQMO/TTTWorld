/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
require('dotenv').config()

const path = require('path')
const fs = require('fs')
// const util = require('util');

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

const Socket = require("./util/socket")
const { serverNotice } = require("./util/util")

const port = process.env.PORT

// do {
//   if (Date.now() % 1000 === 0) {
//     setInterval(() => serverNotice(io), 60 * 1000)
//     break
//   }
// } while (true)


// while (Date.now() % 1000 !== 0) {
//   console.log(Date.now())
// }

// setInterval(() => serverNotice(io), 5 * 1000)



app.post('/google/transcript', async (req, res) => {
  var body = Buffer.from([]); // create a buffer
  req.on('data', function (data) {
    body = Buffer.concat([body, data]);
  });
  req.on('end', async function () {

    var pathname = `${Date.now()}.ogg`;
    fs.writeFileSync(pathname, body);

    const encoding = 'LINEAR16';
    const sampleRateHertz = 16000;
    const languageCode = 'en-US';
    const audio = {
      content: fs.readFileSync(pathname).toString('base64'),
    }

    // const config = {
    //   encoding: encoding,
    //   // sampleRateHertz: sampleRateHertz,
    //   languageCode: languageCode,
    // };

    // const request = {
    //   config: config,
    //   audio: audio,
    // };

    // const translateResult = await Google.translateAudio(request)
    // console.log(`Transcription: ${translateResult}`)

    // var pathname = "test.ogg";
    // const speech = require('@google-cloud/speech');
    // const client = new speech.SpeechClient();

    // async function transcribeContextClasses() {
    //   const audio = {
    //     content: fs.readFileSync(pathname).toString('base64'),
    //   }

    //   const config = {
    //     encoding: 'LINEAR16',
    //     languageCode: 'en-US',
    //     speechContexts: [speechContext],
    //   };

    //   const request = {
    //     config: config,
    //     audio: audio,
    //   };

    //   // Detects speech in the audio file.
    //   const [response] = await client.recognize(request);
    //   console.log(response)

    //   response.results.forEach((result, index) => {
    //     const transcript = result.alternatives[0].transcript;
    //     console.log('-'.repeat(20));
    //     console.log(`First alternative of result ${index}`);
    //     console.log(`Transcript: ${transcript}`);
    //     res.send(transcript)
    //   });
    // }
    // transcribeContextClasses();
  });

})

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

  console.log('Socket server connected')
  Socket.sendWaitingInvite(socket, io)
  socket.on("signin", Socket.onlineNotice(socket, io));
  socket.on("readInvite", Socket.readInvite(socket, io));
  // socket.on("login", Socket.login(socket, io));
  // Listening for joining a room (joinRoom event)
  socket.on("joinRoom", Socket.joinRoom(socket, io));
  socket.on("leaveRoom", Socket.leaveRoom(socket, io));

  // for peer to peer communicate
  socket.on("offer", Socket.offer(socket, io));
  socket.on("answer", Socket.answer(socket, io));
  socket.on("icecandidate", Socket.icecandidate(socket, io));
  socket.on("hangup", Socket.hangup(socket, io));
  socket.on("callend", Socket.callend(socket, io));

  socket.on('message', Socket.message(socket, io))
  socket.on('readMessage', Socket.readMessage(socket, io))
  socket.on('favorite', Socket.favorite(socket, io))
  socket.on('exchangeInvite', Socket.exchangeInvite(socket, io))
  socket.on('acceptExchangeInvite', Socket.acceptExchangeInvite(socket, io))
  socket.on('rejectExchangeInvite', Socket.rejectExchangeInvite(socket, io))
  socket.on('readExchangeInviteAnswer', Socket.readExchangeInviteAnswer(socket, io))

  socket.on('invite', Socket.invite(socket, io))
  socket.on('accept', Socket.accept(socket, io))
  socket.on('reject', Socket.reject(socket, io))

};

io.use(Socket.login)
io.on("connect", onConnect);

server.listen(port, () => {
  console.log(`listening on ${port}`)
})

module.exports = app

