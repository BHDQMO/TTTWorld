let socket
let user
let user_id
let friendData
let friendList
let talkTo
// let room

let localPeer
let cacheStream
let mediaRecorder

// const isPortrait = true;
// const videoConstraints = {
//   'audio': false,
//   'video': {
//     facingMode: 'user',
//     width: isPortrait ? 480 : 640,
//     height: isPortrait ? 640 : 480,
//   },
// }

const audioConstraints = {
  audio: { sampleRate: 16000 }
}

async function renderMessage(msg) {
  const sender = msg.sender
  if (sender === talkTo.user_id || sender === user_id) {
    const template = document.querySelector('#messageTemplate').content
    const clone = document.importNode(template, true)

    if (sender !== user_id) {
      const headIcon = clone.querySelector('#headIcon')
      headIcon.setAttribute('src', friendData[sender].picture)
      headIcon.removeAttribute('hidden')
      from = 'other'
    } else {
      from = 'myself'
    }

    const message = clone.querySelector('#message')
    message.setAttribute('from', from)
    const timeSpan = clone.querySelector('#sendTime')
    timeSpan.textContent = showTime(msg.time)

    switch (msg.type) {
      case 'text': {
        const sourceSpan = clone.querySelector('#content')
        sourceSpan.removeAttribute('hidden')
        sourceSpan.textContent = msg.content

        const translateAudioBtn = clone.querySelector('#translateAudioBtn')
        translateAudioBtn.remove()
        // translateAudioBtn.setAttribute('hidden', '')
        break
      }
      case 'audio': {
        let audioBlob
        if (msg.content.data) {
          buffer = msg.content.data
          var arrayBuffer = new ArrayBuffer(buffer.length);
          var view = new Uint8Array(arrayBuffer);
          buffer.map((b, i) => view[i] = b)
          msg.content = arrayBuffer
        }
        audioBlob = new Blob([msg.content], { type: 'audio/ogg' })
        const audio = clone.querySelector('audio')
        audio.setAttribute('style', 'display: block')
        audio.src = window.URL.createObjectURL(audioBlob)

        const translateMsgBtn = clone.querySelector('#translateMsgBtn')
        translateMsgBtn.setAttribute('hidden', '')
        const speakBtn = clone.querySelector('#speakBtn')
        speakBtn.setAttribute('hidden', '')
        translateMsgBtn.remove()
        speakBtn.remove()
        break
      }
      case 'picture': {
        break
      }
    }
    messages.append(clone)
    messages.scrollTop = messages.scrollHeight
  } else {
    const user_box = document.querySelector(`div[id='${sender}']`)
    const count = user_box.querySelector('.count')
    const num = count.textContent
    const count_circle = user_box.querySelector('.count-circle')
    count_circle.style = 'display: flex'
    count.textContent = parseInt(num) + 1
  }
}

function sendMessage(type, content) {
  data = {
    receiver: talkTo.user_id,
    msg: {
      room: talkTo.room_id,
      sender: user_id,
      type: type,
      content: content
    }
  }

  socket.emit('message', data)
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

  socket.emit('leaveRoom', { user_id, room: talkTo.room_id })
  if (element) {
    talkTo = friendData[element.id]
  }
  socket.emit('joinRoom', { user_id, room: talkTo.room_id })

  const user_box = document.querySelector(`div[id='${talkTo.user_id}']`)
  const count = user_box.querySelector('.count')
  if (count.textContent !== '0') {
    const count_circle = user_box.querySelector('.count-circle')
    count_circle.style = 'display: none'
    count.textContent = 0
    data = [talkTo.user_id, talkTo.room_id]
    console.log(data)
    socket.emit('readMessage', data)
  }

  fetch(`/chat/history?room=${talkTo.room_id}`, {
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
    user = res.user
    user_id = res.user.user_id
    friendList = res.data
    friendData = {}
    friendList.map(item => friendData[item.user_id] = item)
    console.log(friendList)

    socket = io({
      auth: {
        user_id
      }
    })

    //render friend list
    const template = document.querySelector('#uerBoxTemplate').content
    friendList.map(user => {
      const clone = document.importNode(template, true)
      clone.querySelector('.user_box').id = user.user_id
      clone.querySelector('img').setAttribute('src', user.picture)
      clone.querySelector('#name').textContent = user.name
      const exchange = user.native + '<->' + user.learning
      clone.querySelector('#exchange').textContent = exchange
      const unread = user.unread
      if (unread > 0) {
        clone.querySelector('.count-circle').style = 'display: flex'
        clone.querySelector('.count').textContent = unread
      }
      const friend_list = document.querySelector('.friend-list')
      friend_list.append(clone)

    })

    //set room as the global variable
    let params = (new URL(document.location)).searchParams
    let room = parseInt(params.get('room'))

    //decide talk to whom and collect data
    if (!room) {
      talkTo = friendList[0]
    } else {
      talkToId = friendList.map(friend => {
        if (friend.room === room) {
          return friend
        }
      })
      talkTo = friendData[talkToId]
    }

    //render popup form
    document.querySelector('#first-lang').textContent = user.native
    document.querySelector('#second-lang').textContent = user.learning

    //redner chat box header
    document.querySelector('#other_pic').setAttribute('src', talkTo.picture)
    document.querySelector('#other_name').textContent = talkTo.name

    renderHistory()

    socket.emit('joinRoom', { user_id, room: talkTo.room_id })
    socket.on('connect', () => {
      console.log('[socket] connect');
    });

    socket.on('disconnect', () => {
      console.log('[socket] disconnect')
    })
    socket.on('joinRoom', ({ user_id, room }) => {
      console.log(`[Room] ${user_id} join ${room}`)
    })
    socket.on('leaveRoom', (data) => {
      console.log(`[Room] ${data} leave`)
    })
    socket.on('message', (msg) => {
      renderMessage(msg)
    })

    socket.on('friend_online', online_notice)
    socket.on('waitingInvite', renderWaitingIvite)


    socket.on('offer', handleSDPOffer)
    socket.on('answer', handleSDPAnswer)
    socket.on('icecandidate', handleNewIceCandidate)
  })































async function calling() {
  try {
    if (localPeer) {
      alert('[Error] peer已存在')
    } else {
      await createPeerConnection()
      const videoConstraints = await settingVideoConstraints()
      addStreamProcess(videoConstraints)
    }
  } catch (error) {
    console.log(`Error ${error.name}: ${error.message}`)
  }
}

function closing() {
  // Disconnect all our event listeners we don't want stray events to interfere with the hangup while it's ongoing.
  console.log('Closing connection call')
  if (!localPeer) return

  localPeer.onicecandidate = null
  localPeer.ontrack = null
  localPeer.onnegotiationneeded = null
  localPeer.onconnectionstatechange = null
  localPeer.oniceconnectionstatechange = null
  localPeer.onicegatheringstatechange = null
  localPeer.onsignalingstatechange = null

  // Stop all tracks on the connection
  localPeer.getSenders().forEach((sender) => {
    localPeer.removeTrack(sender)
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
  localPeer.close()
  localPeer = null
  cacheStream = null
  dataChannel = null
}
// core functions end














// utils
async function createPeerConnection() {
  localPeer = new RTCPeerConnection()//........................................................................................................................
  localPeer.onicecandidate = handleIceCandidate
  localPeer.onnegotiationneeded = handleNegotiationNeeded
  localPeer.ontrack = await handleRemoteStream

  // //not necessary
  // localPeer.onconnectionstatechange = handleConnectionStateChange
  // localPeer.oniceconnectionstatechange = handleICEConnectionStateChange
  // localPeer.onicegatheringstatechange = handleICEGatheringStateChange
  // localPeer.onsignalingstatechange = handleSignalingStateChange

  // localPeer.ondatachannel = handleDataChannel
  // dataChannel = localPeer.createDataChannel('my local channel')
}

function handleIceCandidate(event) {
  if (event.candidate) {
    console.log(`建立new ICE candicate${event.candidate}`)
    console.log(event.candidate)
    socket.emit('icecandidate', { room: talkTo.room_id, candidate: event.candidate })
  }
  //........................................................................................................................
}

// socket.on('icecandidate', handleNewIceCandidate)

async function handleNewIceCandidate({ room, candidate }) {
  try {
    await localPeer.addIceCandidate(candidate)
    console.log(`*** 成功加入新取得的 ICE candidate: ${JSON.stringify(candidate)}`)
  } catch (error) {
    console.log(`*** 失敗加入新取得的 ICE candidate: ${error.toString()}`)
  }
}

async function getUserStream(constraints) {
  function OldGetUserMedia() {
    return navigator.getUserMedia
      || navigator.webkitGetUserMedia
      || navigator.mozGetUserMedia
      || navigator.msGetUserMedia;
  }

  async function getUserMedia(constraints) {
    if ('mediaDevices' in navigator) {
      return navigator.mediaDevices.getUserMedia(constraints)
    }
    // 相容處理，依照新接口
    navigator.mediaDevices = {};

    navigator.mediaDevices.getUserMedia = function (constraints) {
      const getUserMedia = OldGetUserMedia()

      //不支援的情況下
      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
      }

      // 保持跟原先api一樣故將其封裝成promise
      return new Promise(function (resolve, reject) {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    }

    return navigator.mediaDevices.getUserMedia(constraints)
  }

  cacheStream = await getUserMedia(constraints)
}

async function addStreamProcess(constraints) {
  let errMsg = ''
  try {
    await getUserStream(constraints)
  } catch (error) {
    errMsg = 'get User Stream error ===> ' + error.toString()
    throw new Error(errMsg)
  }

  const localVideo = document.getElementById('localVideo')
  localVideo.srcObject = cacheStream

  // if (window.webkitURL) {
  //   localVideo.src = window.webkitURL.createObjectURL(cacheStream);
  // } else if ("srcObject" in localVideo) {
  //   localVideo.srcObject = cacheStream;
  // } else {
  //   localVideo.src = window.URL.createObjectURL(mediaStream);
  // }

  try {
    cacheStream
      .getTracks()
      .forEach((track) => localPeer.addTrack(track, cacheStream))//........................................................................................................................
    //triggers renegotiation by firing a negotiationneeded event
  } catch (error) {
    errMsg = 'Peer add Transceiver error ===> ' + error.toString()
    throw new Error(errMsg)
  }
}

async function handleNegotiationNeeded() {
  console.log('*** handleNegotiationNeeded fired!')
  try {
    console.log('createOffer ...')
    console.log('setLocalDescription ...')

    const offerOptions = {
      offerToReceiveAudio: 1,
      offerToReceiveVideo: 1
    }
    const offer = await localPeer.createOffer(offerOptions)
    await localPeer.setLocalDescription(offer)

    console.log('signaling offer ...')

    const data = {
      sender: user_id,
      room: talkTo.room_id,
      offer: localPeer.localDescription
    }

    socket.emit('offer', data)//........................................................................................................................
  } catch (error) {
    console.log(`Failed to create session description: ${error.toString()}`)
    console.log(`Error ${error.name}: ${error.message}`)
  }
}

// socket.on('offer', handleSDPOffer)
//........................................................................................................................

async function handleSDPOffer(data) {

  const room = data.room
  const offer = data.offer

  const swalWithBootstrapButtons = Swal.mixin({
    customClass: {
      confirmButton: 'btn btn-success',
      cancelButton: 'btn btn-danger'
    },
    buttonsStyling: false
  })

  swalWithBootstrapButtons.fire({
    title: `${data.sender} is calling you`,
    text: "Do you want to pick the phone?",
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No',
    reverseButtons: true
  }).then(async (result) => {
    if (result.isConfirmed) {
      const videoConstraints = await settingVideoConstraints()
      console.log('*** 收到遠端送來的offer')
      try {
        if (!localPeer) {
          await createPeerConnection()
        }
        console.log('set Remote Description ...')
        await localPeer.setRemoteDescription(data.offer)
        if (!cacheStream) {
          await addStreamProcess(videoConstraints)
        }
        await createAnswer(data)
      } catch (error) {
        console.log(`Failed to create session description: ${error.toString()}`)
        console.log(`Error ${error.name}: ${error.message}`)
      }
    } else if (result.isDenied) {
      swalWithBootstrapButtons.fire(
        'Cancelled',
        'Hang up the call',
        'error'
      )
    }
  })
}

async function createAnswer(data) {
  try {
    console.log('create Answer ...')
    const answer = await localPeer.createAnswer()
    console.log('set Local Description ...')
    await localPeer.setLocalDescription(answer)
    console.log('signaling answer ...')
    data.answer = answer
    socket.emit('answer', data)//........................................................................................................................
  } catch (error) {
    errMsg = 'Create Answer error ===> ' + error.toString()
    throw new Error(errMsg)
  }
}

// socket.on('answer', handleSDPAnswer)

async function handleSDPAnswer(data) {
  console.log('*** 遠端接受我們的offer並發送answer回來')
  try {
    console.log('set Remote Description ...')
    await localPeer.setRemoteDescription(data.answer)
  } catch (error) {
    console.log(`Error ${error.name}: ${error.message}`)
  }
}

async function handleRemoteStream(event) {
  console.log("render remote stream")
  // console.log(event.streams.length)
  if (event.streams.length !== 0) {
    const remoteVideo = document.getElementById('remoteVideo')
    if (remoteVideo.srcObject !== event.streams[0]) {
      remoteVideo.srcObject = event.streams[0]
    }
  }

}
















// function handleConnectionStateChange() {
//   console.log('*** WebRTC connectionState 狀態改變: ' + peer.connectionState)

//   switch (peer.connectionState) {
//     case 'closed':
//     case 'failed':
//     case 'disconnected':
//       closing()
//       break
//   }
// }

// function handleICEConnectionStateChange() {
//   console.log('*** ICE agent連線狀態改變: ' + peer.iceConnectionState)

//   switch (peer.iceConnectionState) {
//     case 'closed':
//     case 'failed':
//     case 'disconnected':
//       closing()
//       break
//   }
// }

// function handleICEGatheringStateChange() {
//   console.log('*** ICE gathering state changed to: ' + peer.iceGatheringState)
// }

// function handleSignalingStateChange() {
//   console.log('*** WebRTC signaling 狀態改變: ' + peer.signalingState)
// }




























function sendSDPBySignaling(event, sdp) {
  socket.emit(event, sdp)
}

async function settingVideoConstraints() {
  return new Promise(async (resolve, reject) => {
    const { value: formValues } = await Swal.fire({
      title: 'Multiple inputs',
      html:
        '<lable for = "swal-input1"> Camera </lable>' +
        '<input type = "checkbox" id="swal-input1" class="swal2-input">' +
        '<lable for = "swal-input2"> Microphone </lable>' +
        '<input type = "checkbox" id="swal-input2" class="swal2-input" value = true >',
      focusConfirm: false,
      preConfirm: () => {
        const isCamera = document.getElementById('swal-input1')
        const isVoice = document.getElementById('swal-input2')
        const videoConstraints = {}
        videoConstraints.video = isCamera.checked ? true : false
        videoConstraints.audio = isVoice.checked ? true : false
        return videoConstraints
      }
    })
    resolve(formValues)
  })
}























































// const receiveBuffer = []
// let receivedSize = 0
// function onReceiveFile(event) {
//   console.log('Received Message', event)
//   console.log(`Received Message ${event.data.byteLength}`)
//   receiveBuffer.push(event.data)
//   receivedSize += event.data.byteLength

//   const receiveProgress = document.querySelector('progress#receiveProgress')
//   receiveProgress.value = receivedSize
// }

// function handleDataChannel(event) {
//   console.log('Receive Data Channel Callback', event)
//   const receiveChannel = event.channel

//   receiveChannel.onmessage = onReceiveMessageCallback
//   receiveChannel.onopen = onChannelStageChange(receiveChannel)
//   receiveChannel.onclose = onChannelStageChange(receiveChannel)
// }

// function sendMessage() {
//   const textArea = document.querySelector('#dataChannelSend')
//   if (dataChannel.readyState === 'open') dataChannel.send(textArea.value)
// }

// function sendFileData() {
//   const fileInput = document.querySelector('input#fileInput')
//   const file = fileInput.files[0]
//   console.log(`File is ${[file.name, file.size, file.type, file.lastModified].join(' ')}`)

//   // Handle 0 size files.
//   if (file.size === 0) {
//     alert('File is empty, please select a non-empty file')
//     return
//   }

//   const fileChannel = peer.createDataChannel('FileChannel')
//   fileChannel.onopen = () => {
//     const sendProgress = document.querySelector('progress#sendProgress')
//     sendProgress.max = file.size
//     const chunkSize = 16384
//     const fileReader = new FileReader()
//     let offset = 0
//     fileReader.addEventListener('error', error => console.error('Error reading file:', error))
//     fileReader.addEventListener('abort', event => console.log('File reading aborted:', event))
//     fileReader.addEventListener('load', e => {
//       console.log('FileRead.onload ', e)
//       fileChannel.send(e.target.result)
//       offset += e.target.result.byteLength
//       sendProgress.value = offset
//       if (offset < file.size) {
//         readSlice(offset)
//       }
//     })
//     const readSlice = o => {
//       console.log('readSlice ', o)
//       const slice = file.slice(offset, o + chunkSize)
//       fileReader.readAsArrayBuffer(slice)
//     }
//     readSlice(0)
//   }
//   fileChannel.onclose = () => console.log('closing File Channel')
// }

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
  const text = element.parentNode.querySelector('#source').textContent
  console.log(element.parentNode)
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
  return
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

function exchange(e) {
  let exchangeForm = document.forms.namedItem('exchangeForm');
  console.log(exchangeForm)
  exchangeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(exchangeForm);
    formData.append('publisher_id', user_id);
    formData.append('first_lang', user.native);
    formData.append('second_lang', user.learning);
    checkBox = document.getElementById("noticing");
    if (checkBox.checked !== true) {
      formData.set('noticing', null);
    }

    fetch('/chat/exchange', {
      method: 'POST',
      body: formData,
    })
      .then(res => res.json())
      .then(res => {
        console.log("===========wait built===========")
      })
  })
}
