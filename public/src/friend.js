let socket = io()

let userId
let userName
let friendList
let room

let peer
let cacheStream
let mediaRecorder

const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
}

const videoConstraints = {
  audio: false,
  video: true
}

const audioConstraints = {
  audio: { sampleRate: 16000 }
}

async function renderTestMessage(msg) {
  const sender = msg.sender
  const template = document.querySelector('#textMessageTemplate').content
  const clone = document.importNode(template, true)
  const message = clone.querySelector('#message')
  const from = sender === userId ? 'myself' : 'other'
  message.setAttribute('from', from)
  // if (sender !== userId) {
  //   const headIcon = clone.querySelector('#headIcon')
  //   headIcon.setAttribute('src', friendData[sender].picture)
  //   headIcon.removeAttribute('hidden')
  // }
  const senderSpan = clone.querySelector('#sender')
  senderSpan.textContent = sender
  const sourceSpan = clone.querySelector('#source')
  sourceSpan.textContent = msg.content
  const timeSpan = clone.querySelector('#time')
  timeSpan.textContent = showTime(msg.time)
  messages.append(clone)
}

async function renderAudioMessage(msg) {
  // data come from server need to pass fetch.json()
  // the buffer data has been hidden in msg.content.data
  // convert buffer to arrayBuffer
  if (msg.content.data) {
    buffer = msg.content.data
    var arrayBuffer = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(arrayBuffer);
    buffer.map((b, i) => view[i] = b)
    msg.content = arrayBuffer
  }

  const newblob = new Blob([msg.content], { type: 'audio/ogg' })
  const item = document.createElement('li')
  const audio = document.createElement('audio')
  audio.setAttribute('controls', '')
  audio.controls = true
  audio.src = window.URL.createObjectURL(newblob)

  const translate = document.createElement('button')
  translate.textContent = 'Translate'
  translate.setAttribute('onclick', 'translateAudio(this)')

  item.appendChild(audio)
  item.appendChild(translate)
  // const messages = document.getElementById('messages')
  messages.appendChild(item)
  messages.scrollTop = messages.scrollHeight
}

async function renderMessage(msg) {
  switch (msg.type) {
    case 'text': {
      renderTestMessage(msg)
      break
    }
    case 'audio': {
      renderAudioMessage(msg)
      break
    }
    case 'picture': {
      break
    }
  }
  messages.scrollTop = messages.scrollHeight
}

function sendMessage(type, content) {
  msg = {
    room: room,
    sender: userId,
    type: type,
    content: content
  }
  console.log('before send')
  socket.emit('message', msg)
}

// text message function
form.addEventListener('submit', function (e) {
  e.preventDefault()
  const input = document.getElementById('input')
  const userinput = input.value
  if (userinput) {
    sendMessage('text', userinput)
    input.value = ''
  }
})

const stopAudioRecord = function () {
  console.log('timeout')
  mediaRecorder.stop()
}

// audio message function
const startAudioRecord = async function () {
  if (!cacheStream) {
    await getUserStream(audioConstraints)
  }
  mediaRecorder = new MediaRecorder(cacheStream)
  mediaRecorder.start()
  setTimeout(stopAudioRecord, 10 * 1000)

  let chunks = []
  mediaRecorder.ondataavailable = function (e) {
    chunks.push(e.data)
  }

  mediaRecorder.onstop = function (e) {
    const blob = new Blob(chunks, { type: 'audio/ogg codecs=opus' })
    console.log(blob)
    sendMessage('audio', blob)
    chunks = []

    const localVideo = document.getElementById('localVideo')
    if (localVideo && !localVideo.srcObject) {
      cacheStream.getTracks().forEach((track) => {
        track.stop()
      })
    }
  }
}

async function renderHistory(element) {
  document.querySelector('#messages').textContent = ''

  socket.emit('leaveRoom', { userId, room })
  if (element) { room = friendData[element.id].room_id }
  socket.emit('joinRoom', { userId, room })

  fetch(`/chat/history?room=${room}`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + window.localStorage.getItem('JWT') }
  }).then(res => res.json())
    .then(res => {
      res.map(msg => renderMessage(msg))
      messages.scrollTop = messages.scrollHeight
    })
}

// first come into this page 
fetch('/chat/friend', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer ' + window.localStorage.getItem('JWT') }
}).then(res => res.json())
  .then(res => {
    userId = res.userId
    friendList = res.data
    friendData = {}
    friendList.map(item => friendData[item.user_id] = item)
    const template = document.querySelector('#uerBoxTemplate').content
    friendList.map(user => {
      const clone = document.importNode(template, true)
      clone.querySelector('.user_box').id = user.user_id
      clone.querySelector('img').setAttribute('src', user.picture)
      clone.querySelector('#name').textContent = user.name
      const exchange = user.native + '<->' + user.learning
      clone.querySelector('#exchange').textContent = exchange
      const friend_list = document.querySelector('.friend-list')
      friend_list.append(clone)
    })

    let params = (new URL(document.location)).searchParams
    room = parseInt(params.get('room'))
    renderHistory()
    socket.emit('joinRoom', { userId, room })
    socket.on('connect', () => {
      console.log('[socket] connect');
    });
    socket.on('disconnect', () => {
      console.log('[socket] disconnect')
    })
    socket.on('joinRoom', ({ userId, room }) => {
      console.log(`[Room] ${userId} join ${room}`)
    })
    socket.on('leaveRoom', (data) => {
      console.log(`[Room] ${data} leave`)
      console.log(data)
    })
    socket.on('message', (msg) => {
      // console.log(msg)
      renderMessage(msg)
    })

    socket.on('offer', handleSDPOffer)
    socket.on('answer', handleSDPAnswer)
    socket.on('icecandidate', handleNewIceCandidate)
  })

function connection() {


}

async function calling() {
  try {
    if (peer) {
      alert('你已經建立連線!')
    } else {
      createPeerConnection()
      await addStreamProcess(videoConstraints)
    }
  } catch (error) {
    console.log(`Error ${error.name}: ${error.message}`)
  }
}

function closing() {
  // Disconnect all our event listeners we don't want stray events to interfere with the hangup while it's ongoing.
  console.log('Closing connection call')
  if (!peer) return

  peer.onicecandidate = null
  peer.ontrack = null
  peer.onnegotiationneeded = null
  peer.onconnectionstatechange = null
  peer.oniceconnectionstatechange = null
  peer.onicegatheringstatechange = null
  peer.onsignalingstatechange = null

  // Stop all tracks on the connection
  peer.getSenders().forEach((sender) => {
    peer.removeTrack(sender)
  })

  // Stop the webcam preview as well by pausing the <video> element, then stopping each of the getUserMedia() tracks on it.
  const localVideo = document.getElementById('localVideo')
  if (localVideo.srcObject) {
    localVideo.pause()
    localVideo.srcObject.getTracks().forEach((track) => {
      track.stop()
    })
  }

  // Close the peer connection
  peer.close()
  peer = null
  cacheStream = null
  dataChannel = null
}
// core functions end

// utils
function createPeerConnection() {
  peer = new RTCPeerConnection()
  peer.onicecandidate = handleIceCandidate
  peer.ontrack = handleRemoteStream
  peer.onnegotiationneeded = handleNegotiationNeeded
  peer.onconnectionstatechange = handleConnectionStateChange
  peer.oniceconnectionstatechange = handleICEConnectionStateChange
  peer.onicegatheringstatechange = handleICEGatheringStateChange
  peer.onsignalingstatechange = handleSignalingStateChange

  // peer.ondatachannel = handleDataChannel
  // dataChannel = peer.createDataChannel('my local channel')
}

function handleDataChannel(event) {
  console.log('Receive Data Channel Callback', event)
  const receiveChannel = event.channel

  receiveChannel.onmessage = onReceiveMessageCallback
  receiveChannel.onopen = onChannelStageChange(receiveChannel)
  receiveChannel.onclose = onChannelStageChange(receiveChannel)
}

function onChannelStageChange(channel) {
  const readyState = channel.readyState
  console.log('Channel Stage Change ==> ', channel)
  console.log(`channel state is: ${readyState}`)
}

function onReceiveMessageCallback(event) {
  const type = event.target.label

  if (type === 'FileChannel') onReceiveFile(event)
  else console.log('Received Message ==> ', event.data)
}

const receiveBuffer = []
let receivedSize = 0
function onReceiveFile(event) {
  console.log('Received Message', event)
  console.log(`Received Message ${event.data.byteLength}`)
  receiveBuffer.push(event.data)
  receivedSize += event.data.byteLength

  const receiveProgress = document.querySelector('progress#receiveProgress')
  receiveProgress.value = receivedSize
}

// function sendMessage() {
//   const textArea = document.querySelector('#dataChannelSend')
//   if (dataChannel.readyState === 'open') dataChannel.send(textArea.value)
// }

function sendFileData() {
  const fileInput = document.querySelector('input#fileInput')
  const file = fileInput.files[0]
  console.log(`File is ${[file.name, file.size, file.type, file.lastModified].join(' ')}`)

  // Handle 0 size files.
  if (file.size === 0) {
    alert('File is empty, please select a non-empty file')
    return
  }

  const fileChannel = peer.createDataChannel('FileChannel')
  fileChannel.onopen = () => {
    const sendProgress = document.querySelector('progress#sendProgress')
    sendProgress.max = file.size
    const chunkSize = 16384
    const fileReader = new FileReader()
    let offset = 0
    fileReader.addEventListener('error', error => console.error('Error reading file:', error))
    fileReader.addEventListener('abort', event => console.log('File reading aborted:', event))
    fileReader.addEventListener('load', e => {
      console.log('FileRead.onload ', e)
      fileChannel.send(e.target.result)
      offset += e.target.result.byteLength
      sendProgress.value = offset
      if (offset < file.size) {
        readSlice(offset)
      }
    })
    const readSlice = o => {
      console.log('readSlice ', o)
      const slice = file.slice(offset, o + chunkSize)
      fileReader.readAsArrayBuffer(slice)
    }
    readSlice(0)
  }

  fileChannel.onclose = () => console.log('closing File Channel')
}

async function handleNegotiationNeeded() {
  console.log('*** handleNegotiationNeeded fired!')
  try {
    console.log('createOffer ...')
    console.log('setLocalDescription ...')
    await peer.setLocalDescription(await peer.createOffer(offerOptions))
    console.log('signaling offer ...')
    socket.emit('offer', peer.localDescription)
  } catch (error) {
    console.log(`Failed to create session description: ${error.toString()}`)
    console.log(`Error ${error.name}: ${error.message}`)
  }
}

function handleSignalingStateChange() {
  console.log('*** WebRTC signaling 狀態改變: ' + peer.signalingState)
}

function handleConnectionStateChange() {
  console.log('*** WebRTC connectionState 狀態改變: ' + peer.connectionState)

  switch (peer.connectionState) {
    case 'closed':
    case 'failed':
    case 'disconnected':
      closing()
      break
  }
}

function handleICEConnectionStateChange() {
  console.log('*** ICE agent連線狀態改變: ' + peer.iceConnectionState)

  switch (peer.iceConnectionState) {
    case 'closed':
    case 'failed':
    case 'disconnected':
      closing()
      break
  }
}

function handleICEGatheringStateChange() {
  console.log('*** ICE gathering state changed to: ' + peer.iceGatheringState)
}

function handleIceCandidate(event) {
  socket.emit('icecandidate', { room: room, candidate: event.candidate })
}

function handleRemoteStream(event) {
  const remoteVideo = document.getElementById('remoteVideo')
  if (remoteVideo.srcObject !== event.streams[0]) {
    remoteVideo.srcObject = event.streams[0]
  }
}

async function getUserStream(constraints) {
  console.log('getUserMedia ...')
  cacheStream = await navigator.mediaDevices.getUserMedia(constraints)
  // if ('mediaDevices' in navigator) {
  //   cacheStream = await navigator.mediaDevices.getUserMedia(constraints)
  // }
}

async function addStreamProcess(constraints) {
  let errMsg = ''
  try {
    await getUserStream(constraints)
  } catch (error) {
    errMsg = 'getUserStream error ===> ' + error.toString()
    throw new Error(errMsg)
  }

  // const videophone = document.getElementById('videophone')
  // videophone.removeAttribute = ('hidden')
  const localVideo = document.getElementById('localVideo')
  localVideo.srcObject = cacheStream

  try {
    cacheStream
      .getTracks()
      .forEach((track) => peer.addTrack(track, cacheStream))
  } catch (error) {
    errMsg = 'Peer addTransceiver error ===> ' + error.toString()
    throw new Error(errMsg)
  }
}

async function handleSDPOffer(desc) {
  console.log('*** 收到遠端送來的offer')
  try {
    if (!peer) {
      createPeerConnection()
    }

    console.log('setRemoteDescription ...')
    await peer.setRemoteDescription(desc)

    if (!cacheStream) {
      await addStreamProcess(videoConstraints)
    }

    await createAnswer()
  } catch (error) {
    console.log(`Failed to create session description: ${error.toString()}`)
    console.log(`Error ${error.name}: ${error.message}`)
  }
}

async function handleSDPAnswer(desc) {
  console.log('*** 遠端接受我們的offer並發送answer回來')
  try {
    console.log('setRemoteDescription ...')
    await peer.setRemoteDescription(desc)
  } catch (error) {
    console.log(`Error ${error.name}: ${error.message}`)
  }
}
async function createAnswer() {
  try {
    console.log('createAnswer ...')
    const answer = await peer.createAnswer()
    console.log('setLocalDescription ...')
    await peer.setLocalDescription(answer)
    console.log('signaling answer ...')
    socket.emit('answer', answer)
  } catch (error) {
    errMsg = 'Create Answer error ===> ' + error.toString()
    throw new Error(errMsg)
  }
}

async function handleNewIceCandidate(candidate) {
  console.log(`*** 加入新取得的 ICE candidate: ${JSON.stringify(candidate)}`)
  try {
    await peer.addIceCandidate(candidate)
  } catch (error) {
    console.log(`Failed to add ICE: ${error.toString()}`)
  }
}

function sendSDPBySignaling(event, sdp) {
  socket.emit(event, sdp)
}

function showTime(time) {
  const current = new Date()
  const sendTime = new Date(time)
  const year = sendTime.getFullYear()
  const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(sendTime).toUpperCase().slice(0, 3)
  const date = sendTime.getDate()
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(sendTime).toUpperCase().slice(0, 3)
  const hour = sendTime.getHours()
  const min = sendTime.getMinutes()
  const oneDay = 1000 * 60 * 60 * 24
  const oneWeek = oneDay * 7
  const oneMonth = oneDay * 30
  const oneYear = oneDay * 365
  const timeGap = current - sendTime

  if (timeGap < oneDay) {
    return hour + ':' + min
  } else if (timeGap < oneWeek) {
    return day + ',' + hour + ':' + min
  } else if (timeGap < oneMonth) {
    return date + ' ' + day + ',' + hour + ':' + min
  } else if (timeGap < oneYear) {
    return month + ' ' + date + ',' + hour + ':' + min
  } else {
    return year + ',' + month + '' + date + ',' + hour + ':' + min
  }
}

// translate audio
async function translateAudio(element) {
  const audio = element.parentNode.firstChild.getAttribute('src');

  fetch(audio)
    .then(res => res.blob()) // mixin takes a Response stream and reads it to completion.
    .then(blob => {
      console.log(blob)
      fetch(`/demoGoogleSpeechToTest`, { method: "POST", body: blob })
        .then(res => console.log(res.text()))
    })
}

// speechSynthesis
function speakMsg(element) {
  const msgContent = element.parentNode.firstChild.textContent.split(':')[1]
  const targetLang = 'en-US' //need change follow the Lang of this msg

  var synth = window.speechSynthesis
  var utterThis = new SpeechSynthesisUtterance(msgContent);
  utterThis.voice = synth.getVoices().find(voice => voice.lang === targetLang)
  synth.speak(utterThis);
}

// translate text
function translateMsg(element) {
  const text = element.parentNode.firstChild.textContent.split(':')[1]
  const target = 'en' //need change follow the user's native zh-TWen-US
  const data = {
    text, target
  }
  console.log(text)
  console.log(target)

  fetch(`/demoGoogleTranslate`, {
    method: "POST",
    headers: {
      'Content-Type': 'application/JSON'
    },
    body: JSON.stringify(data)

  }).then(res => res.json())
    .then(res => {
      const translateResult = document.createElement('span')
      translateResult.textContent = res.data
      ltranslateResult = element.parentNode.insertBefore(translateResult, element.parentNode.childNodes[1])
    })
}

var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;
var recognition = new SpeechRecognition();
recognition.lang = 'zh-TW'; //en-US
recognition.maxAlternatives = 1;
recognition.continuous = true;

function startExchange() {
  recognition.start();
  recognition.onresult = function (event) {
    resultList = event.results
    lastIndex = resultList.length - 1
    lastResult = resultList[lastIndex][0]
    console.log(event.results)
    console.log('Confidence: ' + lastResult.confidence + '\n' + lastResult.transcript.toLowerCase());

    if (lastResult.confidence > 0.925) {
      console.log('over the threshold')
      const warn = document.getElementById("warn")
      warn.textContent = 'Please use English'
      window.setTimeout(() => {
        const warn = document.getElementById("warn")
        warn.textContent = ''
      }, 2 * 1000)
    }
  }

  recognition.onspeechend = function () {
  }

  recognition.onerror = function (event) {
    testBtn.textContent = 'Start new test';
    diagnosticPara.textContent = 'Error occurred in recognition: ' + event.error;
  }

  recognition.onaudiostart = function (event) {
    console.log('SpeechRecognition.onaudiostart');
  }

  recognition.onaudioend = function (event) {
    console.log('SpeechRecognition.onaudioend');
  }

  recognition.onend = function (event) {
    console.log('SpeechRecognition.onend');
  }

  recognition.onnomatch = function (event) {
    console.log('SpeechRecognition.onnomatch');
  }

  recognition.onsoundstart = function (event) {
    console.log('SpeechRecognition.onsoundstart');
  }

  recognition.onsoundend = function (event) {
    console.log('SpeechRecognition.onsoundend');
  }

  recognition.onspeechstart = function (event) {
    console.log('SpeechRecognition.onspeechstart');
  }
  recognition.onstart = function (event) {
    console.log('SpeechRecognition.onstart');
  }
}

function stopExchange() {
  recognition.stop();
}

function booking() {

}

function openForm() {
  document.querySelector(".form-popup").style.display = "block";
}

function closeForm() {
  document.querySelector(".form-popup").style.display = "none";
}

function exchange() {
  let exchangeForm = document.forms.exchangeForm
  const formData = new FormData(exchangeForm)
  fetch('/chat/exchange', { method: 'POST' })
    .then(res => res.json())
    .then(res => {

    })
}
