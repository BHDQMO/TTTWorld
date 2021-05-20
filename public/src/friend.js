let socket = io()
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

function connection() {
  // socket = io()
  socket.emit('joinRoom', { username: 'test' })

  socket.on('newUser', (data) => {
    console.log('Welcome to Socket.IO Chat – ')
    console.log(data)
  })

  socket.on('userLeave', (data) => {
    console.log('Someone Leave ~')
    console.log(data)
  })

  socket.on('disconnect', () => {
    console.log('you have been disconnected')
  })

  socket.on('offer', handleSDPOffer)
  socket.on('answer', handleSDPAnswer)
  socket.on('icecandidate', handleNewIceCandidate)

  // return socket
}

socket.on('chat message', (msg) => {
  const item = document.createElement('div')
  const msgContent = document.createElement('sapn')
  msgContent.textContent = msg

  const translate = document.createElement('button')
  translate.textContent = 'Translate'
  translate.setAttribute('onclick', 'translateMsg(this)')

  const speak = document.createElement('button')
  speak.textContent = 'Speak'
  speak.setAttribute('onclick', 'speakMsg(this)')

  const messages = document.getElementById('messages')

  item.appendChild(msgContent)
  item.appendChild(translate)
  item.appendChild(speak)
  messages.appendChild(item)

  messages.scrollTop = messages.scrollHeight
})

socket.on('record', (blob) => {
  const newblob = new Blob([blob], { type: 'audio/ogg' })

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
  messages.appendChild(item)
})

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

function sendMessage() {
  const textArea = document.querySelector('#dataChannelSend')
  if (dataChannel.readyState === 'open') dataChannel.send(textArea.value)
}

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
  socket.emit('icecandidate', event.candidate)
}

function handleRemoteStream(event) {
  const remoteVideo = document.getElementById('remoteVideo')
  if (remoteVideo.srcObject !== event.streams[0]) {
    remoteVideo.srcObject = event.streams[0]
  }
}

async function getUserStream(constraints) {
  console.log('getUserMedia ...')
  if ('mediaDevices' in navigator) {
    cacheStream = await navigator.mediaDevices.getUserMedia(constraints)
  }
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

// text message function

const form = document.getElementById('form')
const input = document.getElementById('input')

form.addEventListener('submit', function (e) {
  e.preventDefault()
  if (input.value) {
    socket.emit('chat message', input.value)
    input.value = ''
  }
})

// audio message function
const startAudioRecord = async function () {
  if (!cacheStream) {
    await getUserStream(audioConstraints)
  }
  mediaRecorder = new MediaRecorder(cacheStream)
  mediaRecorder.start()
  console.log('start record')

  let chunks = []

  setTimeout(stopAudioRecord, 10 * 1000)

  mediaRecorder.ondataavailable = function (e) {
    chunks.push(e.data)
  }

  mediaRecorder.onstop = function (e) {
    const blob = new Blob(chunks, { type: 'audio/ogg codecs=opus' })
    socket.emit('record', blob)
    chunks = []

    const localVideo = document.getElementById('localVideo')
    if (!localVideo.srcObject) {
      cacheStream.getTracks().forEach((track) => {
        track.stop()
      })
    }
  }
}

const stopAudioRecord = function () {
  console.log('timeout')
  mediaRecorder.stop()
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

  // let xhr = new XMLHttpRequest();
  // xhr.open('POST', '/demoGoogleTranslate');
  // xhr.onreadystatechange = function () {
  //   if (xhr.readyState === 4) {
  //     console.log(xhr.responseText)
  //     const translateResult = document.createElement('span')
  //     translateResult.textContent = res.data
  //     ltranslateResult = element.parentNode.insertBefore(translateResult, element.parentNode.childNodes[1])
  //   }
  // };
  // xhr.setRequestHeader('content-type', 'application/JSON')
  // xhr.send(JSON.stringify(data));

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
    // recognition.start();
  }

  recognition.onerror = function (event) {
    testBtn.textContent = 'Start new test';
    diagnosticPara.textContent = 'Error occurred in recognition: ' + event.error;
  }

  recognition.onaudiostart = function (event) {
    //Fired when the user agent has started to capture audio.
    console.log('SpeechRecognition.onaudiostart');
  }

  recognition.onaudioend = function (event) {
    //Fired when the user agent has finished capturing audio.
    console.log('SpeechRecognition.onaudioend');
  }

  recognition.onend = function (event) {
    //Fired when the speech recognition service has disconnected.
    console.log('SpeechRecognition.onend');
  }

  recognition.onnomatch = function (event) {
    //Fired when the speech recognition service returns a final result with no significant recognition. This may involve some degree of recognition, which doesn't meet or exceed the confidence threshold.
    console.log('SpeechRecognition.onnomatch');
  }

  recognition.onsoundstart = function (event) {
    //Fired when any sound — recognisable speech or not — has been detected.
    console.log('SpeechRecognition.onsoundstart');
  }

  recognition.onsoundend = function (event) {
    //Fired when any sound — recognisable speech or not — has stopped being detected.
    console.log('SpeechRecognition.onsoundend');
  }

  recognition.onspeechstart = function (event) {
    //Fired when sound that is recognised by the speech recognition service as speech has been detected.
    console.log('SpeechRecognition.onspeechstart');
  }
  recognition.onstart = function (event) {
    //Fired when the speech recognition service has begun listening to incoming audio with intent to recognize grammars associated with the current SpeechRecognition.
    console.log('SpeechRecognition.onstart');
  }
}

function stopExchange() {
  recognition.stop();
}
