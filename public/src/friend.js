'user strict'

let socket
let user
let user_id
let friendData
let friendList
let talkTo
let historyData = {}

let localPeer
let cacheStream
let mediaRecorder //new MediaRecorder(cacheStream) for voiceRecorder
let voiceRecorder //new MediaRecorder(cacheStream) for SpeechRecognition

let textTranslatelang = 'en' //native lang
let audioTranlateLang = 'en-US' //native lang
let speechSynthesisLang = 'en-US' //text lang
let speechRecognitionLearningLang = 'en-US' //target Lang when exchange 'zh-TW''en-US'
let speechRecognitionNativeLang = 'zh-TW'

async function renderMessage(msg) {
  const sender = msg.sender
  if (sender === talkTo.user_id || sender === user_id) {
    const template = document.querySelector('#messageTemplate').content
    const clone = document.importNode(template, true)

    let from
    if (sender !== user_id) {
      const headIcon = clone.querySelector('#headIcon')
      headIcon.setAttribute('src', friendData[sender].picture)
      headIcon.removeAttribute('hidden')
      from = 'other'
    } else {
      from = 'myself'
    }

    const msgReplyBtn = document.querySelector(`button[historyId ='${msg.reply}']`)
    let replyContent

    if (msg.reply !== null) {
      replyType = msgReplyBtn.getAttribute('contentType')
      switch (replyType) {
        case 'text': {
          const textElement = msgReplyBtn.parentNode.parentNode.children[0]
          replyContent = document.importNode(textElement, true)
          if (msg.correct === 1) {
            let wrongString = replyContent.textContent.split('')
            let rightString = msg.content.split('')
            const result = patienceDiff(wrongString, rightString).lines
            let tempString = ''
            let isDetected = false
            const markedWrongSpans = document.createElement('div')
            markedWrongSpans.setAttribute('id', 'spanContainer')
            result.map((char, i) => {
              if (char.aIndex !== -1) {
                if (char.bIndex !== -1 && isDetected === false) {
                  tempString += char.line
                } else if (char.bIndex === -1 && isDetected === false) {
                  const tempElement = document.createElement('span')
                  tempElement.textContent = tempString
                  tempElement.setAttribute('class', 'pass')
                  markedWrongSpans.appendChild(tempElement)
                  tempString = '' + char.line
                  isDetected = true
                } else if (char.bIndex === -1 && isDetected === true) {
                  tempString += char.line
                } else if (char.bIndex !== -1 && isDetected === true) {
                  const tempElement = document.createElement('span')
                  tempElement.textContent = tempString
                  tempElement.setAttribute('class', 'fix')
                  markedWrongSpans.appendChild(tempElement)
                  tempString = '' + char.line
                  isDetected = false
                }
                if (i === result.length - 1) {
                  const tempElement = document.createElement('span')
                  tempElement.textContent = tempString
                  if (isDetected === false) {
                    tempElement.setAttribute('class', 'pass')
                  } else {
                    tempElement.setAttribute('class', 'fix')
                  }
                  markedWrongSpans.appendChild(tempElement)
                }
              }
            })

            replyContent = markedWrongSpans
          }
          break
        }
        case 'audio': {
          const audioElement = msgReplyBtn.parentNode.parentNode.children[1]
          replyContent = document.importNode(audioElement, true)
          break
        }
      }
      const replyMsg = clone.querySelector('#replyMsg')
      replyMsg.append(replyContent)
      replyMsg.style = 'display:flex'
    }


    const message = clone.querySelector('#message')
    message.setAttribute('from', from)
    const replyBtn = clone.querySelector("#reply")
    replyBtn.setAttribute('historyId', msg.id)
    replyBtn.setAttribute('senderId', msg.sender)
    replyBtn.setAttribute('contentType', msg.type)
    const timeSpan = clone.querySelector('#sendTime')
    timeSpan.textContent = showTime(msg.time)

    switch (msg.type) {
      case 'text': {

        //render correction
        if (msg.correct === 1) {
          let wrongString = replyContent.textContent.split('')
          let rightString = msg.content.split('')
          const result = patienceDiff(wrongString, rightString).lines

          let tempString = ''
          let isDetected = false
          let markedRightSpans = document.createElement('div')
          markedRightSpans.setAttribute('id', 'spanContainer')
          markedRightSpans.setAttribute('id', 'content')

          result.map((char, i) => {
            if (char.bIndex !== -1) {
              if (char.aIndex !== -1 && isDetected === false) {
                tempString += char.line
              } else if (char.aIndex === -1 && isDetected === false) {
                const tempElement = document.createElement('span')
                tempElement.textContent = tempString
                tempElement.setAttribute('class', 'pass')
                markedRightSpans.appendChild(tempElement)
                tempString = '' + char.line
                isDetected = true
              } else if (char.aIndex === -1 && isDetected === true) {
                tempString += char.line
              } else if (char.aIndex !== -1 && isDetected === true) {
                const tempElement = document.createElement('span')
                tempElement.textContent = tempString
                tempElement.setAttribute('class', 'correction')
                markedRightSpans.appendChild(tempElement)
                tempString = '' + char.line
                isDetected = false
              }
              if (i === result.length - 1) {
                const tempElement = document.createElement('span')
                tempElement.textContent = tempString
                if (isDetected === false) {
                  tempElement.setAttribute('class', 'pass')
                } else {
                  tempElement.setAttribute('class', 'correction')
                }
                markedRightSpans.appendChild(tempElement)
              }
            }

          })

          const originMsg = clone.querySelector('#originMsg')
          const textSpan = clone.querySelector('#content')
          textSpan.remove()
          const audio = clone.querySelector('#originMsg audio')
          markedRightSpans = originMsg.insertBefore(markedRightSpans, audio)
        } else {
          const sourceSpan = clone.querySelector('#originMsg #content')
          sourceSpan.removeAttribute('hidden')
          sourceSpan.textContent = msg.content
        }
        const translateAudioBtn = clone.querySelector('#translateAudioBtn')
        translateAudioBtn.remove()
        break
      }
      case 'audio': {
        console.log(msg.content)
        console.log(msg.content.data)
        if (msg.content.data) {
          const buffer = msg.content.data
          var arrayBuffer = new ArrayBuffer(buffer.length);
          var view = new Uint8Array(arrayBuffer);
          buffer.map((b, i) => view[i] = b)
          msg.content = arrayBuffer
        }
        console.log(msg.content)
        const audioBlob = new Blob([msg.content], { type: 'audio/ogg' })
        const audio = clone.querySelector('audio')
        audio.setAttribute('style', 'display: block')
        audio.src = window.URL.createObjectURL(audioBlob)

        const translateMsgBtn = clone.querySelector('#translateMsgBtn')
        translateMsgBtn.setAttribute('hidden', '')
        const speakBtn = clone.querySelector('#speakBtn')
        speakBtn.setAttribute('hidden', '')
        const correctBtn = clone.querySelector('#correctBtn')
        correctBtn.setAttribute('hidden', '')
        translateMsgBtn.remove()
        speakBtn.remove()
        correctBtn.remove()
        break
      }
      case 'picture': {
        break
      }
    }

    const messages = document.querySelector('#messages')
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
  let historyId = null
  const replyBodyNum = document.querySelector('#replyBody').children.length
  if (replyBodyNum > 1) {
    historyId = replyBody.getAttribute('historyId')
    replyBody.lastChild.remove()
    document.querySelector('#replyTo').style = 'display:none'
  }

  let correct = 0
  const userInput = document.querySelector('#input')
  if (userInput.hasAttribute('correct')) {
    correct = 1
    userInput.removeAttribute('correct')
  }

  const data = {
    receiver: talkTo.user_id,
    msg: {
      reply: historyId,
      correct: correct,
      room: talkTo.room_id,
      sender: user_id,
      type: type,
      content: content,
    }
  }
  socket.emit('message', data)
}

// reply message
function reply(element) {
  const testContent = document.querySelector('#replyTo #content')
  const audioContent = document.querySelector('#replyTo audio')
  if (testContent) {
    testContent.remove()
  }
  if (audioContent) {
    audioContent.remove()
  }

  const type = element.getAttribute('contentType')
  let clone
  switch (type) {
    case 'text': {
      const textElement = element.parentNode.parentNode.children[0]
      clone = textElement.cloneNode('deep')
      if (clone.tagName = 'div') {
        const span = document.createElement('span')
        span.id = 'content'
        span.textContent = clone.innerText
        clone = span
      }
      break
    }
    case 'audio': {
      const audioElement = element.parentNode.parentNode.children[1]
      clone = audioElement.cloneNode('deep')
      break
    }
  }

  const replyTo = document.querySelector('#replyTo')
  const sender = parseInt(element.getAttribute('senderid'))
  const historyId = parseInt(element.getAttribute('historyid'))
  try {
    replyTo.querySelector('img').src = friendData[sender].picture
    replyTo.querySelector('span#senderName').textContent = friendData[sender].name
  } catch (e) {
    replyTo.querySelector('img').src = user.picture
    replyTo.querySelector('span#senderName').textContent = user.name
  }
  const replyBody = document.querySelector('#replyBody')
  const messages = document.querySelector('#messages')
  messages.style = 'max-height: 59vh'
  replyBody.setAttribute('historyId', historyId)
  replyBody.append(clone)
  replyTo.style = 'display:flex'

  //return for correct

  return clone.textContent
}

// cancel reply
function cancelReply() {
  const testContent = document.querySelector('#replyTo #content')
  const audioContent = document.querySelector('#replyTo audio')
  if (testContent) {
    testContent.remove()
  }
  if (audioContent) {
    audioContent.remove()
  }
  const replyTo = document.querySelector('#replyTo')
  replyTo.style = 'display:none'
  const messages = document.querySelector('#messages')
  messages.style = 'max-height: 69vh'
}

function correct(element) {
  const replyBtnElement = element.previousElementSibling
  const userInputBox = document.querySelector('#input')
  userInputBox.value = reply(replyBtnElement)
  userInputBox.setAttribute('correct', '')
}

function favorite(element) {
  history_id = element.parentNode.parentNode.querySelector('#reply').getAttribute('historyId')
  const data = { user_id, history_id }
  socket.emit('favorite', data)
  Swal.fire('Add to your collection!')
}


// text message function
const form = document.forms.textInput
form.addEventListener('submit', function (e) {
  e.preventDefault()

  const input = document.getElementById('input')
  const userinput = input.value

  if (userinput) {
    sendMessage('text', userinput)
    input.value = ''
  }
  const messages = document.querySelector('#messages')
  messages.style = 'max-height: 69vh'
})

const stopAudioRecord = function () {
  console.log('timeout')
  mediaRecorder.stop()
}

// audio message function
const startAudioRecord = async function () {
  const audioConstraints = {
    audio: { sampleRate: 16000 }
  }

  if (!cacheStream) {
    await getUserStream(audioConstraints)
  } else if (cacheStream.active === false) {
    await getUserStream(audioConstraints)
  } else if (cacheStream.getAudioTracks().length === 0) {
    await getUserStream(audioConstraints)
  }

  mediaRecorder = new MediaRecorder(cacheStream)
  mediaRecorder.start()
  const timeoutID = setTimeout(stopAudioRecord, 10 * 1000)

  let chunks = []
  mediaRecorder.ondataavailable = function (e) {
    console.log(e.data)
    chunks.push(e.data)
  }

  mediaRecorder.onstop = function (e) {
    console.log(chunks)
    clearTimeout(timeoutID)
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

const recordVoiceMsgBtn = document.querySelector('#recordVoiceMsgBtn')
recordVoiceMsgBtn.addEventListener('mousedown', (event) => {
  startAudioRecord()
  event.target.style = 'background: lightgrey'
})

recordVoiceMsgBtn.addEventListener('mouseup', (event) => {
  stopAudioRecord()
  event.target.style = 'background: rgba(45, 58, 56, 0.74)'
})

async function renderHistory(element) {
  document.querySelector('#messages').textContent = ''

  socket.emit('leaveRoom', { user_id, room: talkTo.room_id })
  // on click diffenet friend, need render respective history
  if (element) {
    talkTo = friendData[element.id]
  }
  socket.emit('joinRoom', { user_id, room: talkTo.room_id })

  document.querySelector('#other_pic').setAttribute('src', talkTo.picture)
  document.querySelector('#other_name').textContent = talkTo.name

  const user_box = document.querySelector(`div[id='${talkTo.user_id}']`)
  const count = user_box.querySelector('.count')
  if (count.textContent !== '0') {
    const count_circle = user_box.querySelector('.count-circle')
    count_circle.style = 'display: none'
    count.textContent = 0
    const data = [talkTo.user_id, talkTo.room_id]
    console.log(data)
    socket.emit('readMessage', data)
  }

  fetch(`/chat/history?room=${talkTo.room_id}`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + window.localStorage.getItem('JWT') }
  }).then(res => res.json())
    .then(res => {
      res.map((msg) => {
        renderMessage(msg)
      })
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
      const talkToId = friendList.map(friend => {
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
    const videoBbox = document.querySelector('.video-box')
    videoBbox.style = 'display:none'
    localVideo.pause()
    localVideo.srcObject.getTracks().forEach((track) => {
      track.stop()
    })
  }

  // Close the peer connection
  localPeer.close()
  localPeer = null
  cacheStream = null
}

// utils
async function createPeerConnection() {
  localPeer = new RTCPeerConnection()//........................................................................................................................
  localPeer.onicecandidate = handleIceCandidate
  localPeer.onnegotiationneeded = handleNegotiationNeeded
  localPeer.ontrack = handleRemoteStream
}

function handleIceCandidate(event) {
  if (event.candidate) {
    console.log(`*** [WebRTC] find new ICE candicate ${event.candidate.candidate}`)
    socket.emit('icecandidate', { room: talkTo.room_id, candidate: event.candidate })
  }
  //........................................................................................................................
}

// socket.on('icecandidate', handleNewIceCandidate)

async function handleNewIceCandidate({ room, candidate }) {
  try {
    if (!localPeer) {
      createPeerConnection()
    }
    await localPeer.addIceCandidate(candidate)
    console.log(`*** [WebRTC] add ICE candidate: ${JSON.stringify(candidate.candidate)}`)
  } catch (error) {
    console.log(`*** [WebRTC] fail to add ICE candidate: ${error.toString()}`)
  }
}

async function getUserStream(constraints) {
  cacheStream = await navigator.mediaDevices.getUserMedia(constraints)
}

async function addStreamProcess(constraints) {
  try {
    await getUserStream(constraints)
  } catch (error) {
    throw new Error('*** [WebRTC] get User Stream error: ' + error.toString())
  }

  const videoBbox = document.querySelector('.video-box')
  videoBbox.style = 'display:flex'
  const localVideo = document.querySelector('#localVideo')
  console.log(localVideo)
  localVideo.srcObject = cacheStream

  try {
    cacheStream
      .getTracks()
      .forEach((track) => localPeer.addTrack(track, cacheStream))//........................................................................................................................
    //triggers renegotiation by firing a negotiationneeded event
  } catch (error) {
    throw new Error('*** [WebRTC] Peer add Track error: ' + error.toString())
  }
}

async function handleNegotiationNeeded() {
  console.log('*** [WebRTC] handleNegotiationNeeded fired!')
  try {
    const offerOptions = {
      offerToReceiveAudio: 1,
      offerToReceiveVideo: 1
    }
    console.log('*** [WebRTC] createOffer ...')
    const offer = await localPeer.createOffer(offerOptions)
    console.log('*** [WebRTC] setLocalDescription ...')
    await localPeer.setLocalDescription(offer)

    const data = {
      sender: user_id,
      room: talkTo.room_id,
      offer: localPeer.localDescription
    }
    console.log('*** [WebRTC] signaling offer ...')
    socket.emit('offer', data)//........................................................................................................................
  } catch (error) {
    console.log(`*** [WebRTC] failed to create offer: ${error.toString()}`)
    console.log(`*** [WebRTC] Error ${error.name}: ${error.message}`)
  }
}

// socket.on('offer', handleSDPOffer)
//........................................................................................................................

async function handleSDPOffer(data) {
  console.log('*** [WebRTC] receive offer')

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
      try {
        if (!localPeer) {
          await createPeerConnection()
        }
        console.log('*** [WebRTC] set Remote Description ...')
        await localPeer.setRemoteDescription(data.offer)
        if (!cacheStream) {
          const videoConstraints = await settingVideoConstraints()
          await addStreamProcess(videoConstraints)
        }
        await createAnswer(data)
      } catch (error) {
        console.log(`*** [WebRTC] Failed to create answer: ${error.toString()}`)
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
    console.log('*** [WebRTC] create Answer ...')
    const answer = await localPeer.createAnswer()
    console.log('*** [WebRTC] set Local Description ...')
    await localPeer.setLocalDescription(answer)
    console.log('*** [WebRTC] signaling answer ...')
    data.answer = answer
    socket.emit('answer', data)//........................................................................................................................
  } catch (error) {
    console.log('*** [WebRTC] Create Answer error: ' + error.toString())
  }
}

// socket.on('answer', handleSDPAnswer)//.......................................

async function handleSDPAnswer(data) {
  console.log('*** [WebRTC] receive answer')
  try {
    console.log('*** [WebRTC] set Remote Description ...')
    await localPeer.setRemoteDescription(data.answer)
  } catch (error) {
    console.log(`*** [WebRTC] Error ${error.name}: ${error.message}`)
  }
}

async function handleRemoteStream(event) {
  console.log("*** [WebRTC] render remote stream")
  // console.log(event.streams.length)
  const remoteVideo = document.querySelector("#remoteVideo")
  if (event.streams.length !== 0 && remoteVideo.srcObject !== event.streams[0]) {
    remoteVideo.srcObject = event.streams[0]
  }
}

async function settingVideoConstraints() {
  return new Promise(async (resolve, reject) => {
    const { value: formValues } = await Swal.fire({
      title: 'Set the environment',
      html:
        // '<lable for = "swal-input1"> Camera </lable>' +
        'Camera:<input type = "checkbox" id="swal-input1" class="swal2-input">' +
        // '<lable for = "swal-input2"> Microphone </lable>' +
        'Microphone:<input type = "checkbox" id="swal-input2" class="swal2-input" value = true >',
      focusConfirm: false,
      icon: 'question',
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

// translate text
function translateMsg(element) {
  const text = element.parentNode.parentNode.querySelector('#content').innerText
  const target = textTranslatelang //need change follow the user's native zh-TWen-US
  const data = {
    text, target
  }
  fetch(`/demoGoogleTranslate`, {
    method: "POST",
    headers: {
      'Content-Type': 'application/JSON'
    },
    body: JSON.stringify(data)
  }).then(res => res.json())
    .then(res => {
      console.log(res)
      const translateMsg = element.parentNode.parentNode.parentNode.children[2]
      const translateContent = translateMsg.querySelector('span')
      translateContent.textContent = res.data
      translateMsg.style = 'display: flex'
      // translateResult = element.parentNode.insertBefore(translateResult, element.parentNode.childNodes[1])
    })
  return
}

// translate audio
async function translateAudio(element) {
  const audio = element.parentNode.parentNode.children[1].getAttribute('src');
  console.log(audio)

  fetch(audio)
    .then(res => res.blob()) // mixin takes a Response stream and reads it to completion.
    .then(blob => {
      console.log(blob)

      fetch(`/demoGoogleSpeechToTest`, {
        method: "POST",
        body: blob,
        headers: {
          'targetLang': `${audioTranlateLang}`,
        }
      })
        .then(res => console.log(res.text()))
    })
}

// speechSynthesis
function speakMsg(element) {
  const msgContent = element.parentNode.parentNode.children[0].innerText
  const targetLang = speechSynthesisLang //need change follow the Lang of this msg
  try {
    var synth = window.speechSynthesis
    var utterThis = new SpeechSynthesisUtterance(msgContent);
    utterThis.voice = synth.getVoices().find(voice => voice.lang === targetLang)
    console.log(synth.getVoices())
    synth.speak(utterThis);
  } catch (e) {
    console.log(e)
  }
}

var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;
var recognition1 = new SpeechRecognition();
var recognition2 = new SpeechRecognition();
let exchangeFinal = {}
let lowScoreList = {}
let chunks = []
let startTime
let startPt
let isNeedStoreCheck = {}

async function startSpeechRecognition() {
  recognition1.lang = speechRecognitionNativeLang
  recognition1.maxAlternatives = 1;
  recognition1.interimResults = false;

  recognition2.lang = speechRecognitionLearningLang
  recognition2.maxAlternatives = 1;
  recognition2.interimResults = false;

  const audioConstraints = {
    audio: { sampleRate: 16000 }
  }

  if (!cacheStream) {
    console.log("create new stream")
    await getUserStream(audioConstraints)
  } else if (cacheStream.active === false) {
    console.log("stream inactive, create new one")
    await getUserStream(audioConstraints)
  } else if (cacheStream.getAudioTracks().length === 0) {
    console.log("audio stream does not exist, create now one")
    await getUserStream(audioConstraints)
  }
  console.log(cacheStream)

  voiceRecorder = new MediaRecorder(cacheStream)

  voiceRecorder.start()

  let ondataavailableCounter = 0
  voiceRecorder.ondataavailable = async function (e) {
    ondataavailableCounter++
    console.log('ondataavailableCounter: ' + ondataavailableCounter)
    if (isNeedStoreCheck[ondataavailableCounter] === true) {
      const blob = new Blob([e.data], { type: 'audio/ogg codecs=opus' })
      arrayBuffer = await new Response(blob).arrayBuffer()
      const audioBlob = new Blob([arrayBuffer], { type: 'audio/ogg' })
      const audioUrl = window.URL.createObjectURL(audioBlob)

      lowScoreList[ondataavailableCounter].audioUrl = audioUrl
      console.log('Attach ' + ondataavailableCounter + 'th' + ' recored')
      delete blob
      delete audioBlob
      delete audioUrl
    }
  }

  voiceRecorder.onstop = function (e) {
    const localVideo = document.getElementById('localVideo')
    if (localVideo && !localVideo.srcObject) {
      cacheStream.getTracks().forEach((track) => {
        track.stop()
      })
    }
  }
  // recognition1.start();
  recognition2.start();

  // recognition1.onstart = async function (event) {
  //   console.log('[SpeechRecognition1] recognition start');
  // }

  // recognition1.onaudiostart = function (event) {
  //   console.log('[SpeechRecognition1] audio start');
  // }

  // recognition1.onsoundstart = function (event) {
  //   console.log('[SpeechRecognition1] sound start');
  // }

  // recognition1.onspeechstart = function (event) {
  //   console.log('[SpeechRecognition1] speechs tart');
  // }

  // recognition1.onresult = function (event) {
  //   const resultList = event.results
  //   const lastIndex = resultList.length - 1
  //   const lastResult = resultList[lastIndex][0]
  //   console.log(event.results)
  //   console.log('Confidence: ' + lastResult.confidence + '\n' + lastResult.transcript.toLowerCase());

  //   if (lastResult.confidence > 0.92) {
  //     console.log('over the threshold')
  //     const warn = document.getElementById("warn")
  //     warn.textContent = `Please use ${speechRecognitionLearningLang}`
  //     window.setTimeout(() => {
  //       const warn = document.getElementById("warn")
  //       warn.textContent = ''
  //     }, 2 * 1000)
  //   }
  // }

  // recognition1.onnomatch = function (event) {
  //   console.log('[SpeechRecognition1] no match');
  // }

  // recognition1.onspeechend = function () {
  //   console.log('[SpeechRecognition1] speech end');
  // }

  // recognition1.onsoundend = function (event) {
  //   console.log('[SpeechRecognition1] sound end');
  // }

  // recognition1.onaudioend = function (event) {
  //   console.log('[SpeechRecognition1] audio end');
  // }

  // recognition1.onend = function (event) {
  //   console.log('[SpeechRecognition1] recognition end');
  //   recognition1.start();
  // }

  // recognition1.onerror = function (event) {
  //   console.log('[SpeechRecognition1] error occurred: ' + event.error);
  // }

  recognition2.onstart = async function (event) {
    console.log('[SpeechRecognition2] recognition start');
  }

  recognition2.onaudiostart = function (event) {
    console.log('[SpeechRecognition2] audio start');
  }

  recognition2.onsoundstart = function (event) {
    console.log('[SpeechRecognition2] sound start');
  }

  recognition2.onspeechstart = function (event) {
    console.log('[SpeechRecognition2] speechs tart');
  }

  let onresultCounter = 0
  recognition2.onresult = async function (event) {
    const resultList = event.results
    const lastIndex = resultList.length - 1
    const lastResult = resultList[lastIndex]
    const alternative = lastResult[0]
    console.log(event.results)
    console.log('Confidence: ' + alternative.confidence + '\n' + alternative.transcript.toLowerCase());

    if (lastResult.isFinal === true) {
      voiceRecorder.requestData()
      onresultCounter++
      if (alternative.confidence < 1) {
        isNeedStoreCheck[onresultCounter] = true
        const millisToMinutesAndSeconds = (millis) => {
          var minutes = Math.floor(millis / 60000);
          var seconds = ((millis % 60000) / 1000).toFixed(0);
          return `${minutes}:${(seconds < 10 ? "0" : "")}${seconds}`;
        }

        let endTime = Date.now()
        const timing = millisToMinutesAndSeconds(endTime - startTime)

        const transcript = alternative.transcript
        const confidence = alternative.confidence
        const data = {
          timing,
          transcript,
          confidence,
        }
        lowScoreList[onresultCounter] = data
        console.log('Store ' + onresultCounter + 'th' + ' transcript')
      }
    }
  }

  recognition2.onnomatch = function (event) {
    console.log('[SpeechRecognition2] no match');
  }

  recognition2.onspeechend = function () {
    console.log('[SpeechRecognition2] speech end');
  }

  recognition2.onsoundend = function (event) {
    console.log('[SpeechRecognition2] sound end');
  }

  recognition2.onaudioend = function (event) {
    console.log('[SpeechRecognition2] audio end');
  }

  recognition2.onend = function (event) {
    console.log('[SpeechRecognition2] recognition end');
    if (cacheStream) {
      if (cacheStream.active === true) {
        if (cacheStream.getTracks().length > 0) {
          recognition2.lang = speechRecognitionLearningLang
          recognition2.start();
        }
      }
    }
  }
  recognition2.onerror = function (event) {
    console.log('[SpeechRecognition2] error occurred: ' + event.error);
  }
}

function stopSpeechRecognition() {
  // recognition1.stop();
  voiceRecorder.stop()
  recognition2.stop();

  // lowScoreList = Object.values(lowScoreList).map(item => {
  //   console.log(item.audioBlob)
  //   const audioBlob = new Blob(item.audioBlob, { type: 'audio/ogg' })
  //   console.log(audioBlob)
  //   const audioUrl = window.URL.createObjectURL(audioBlob)
  //   console.log(audioUrl)
  //   item.audioUrl = audioUrl
  //   delete item.audioBlob
  //   return item
  // })
  // exchangeFinal.lowScoreList = lowScoreList
  Object.values(lowScoreList).map(item => {
    fetch(`/demoGoogleSpeechToTest`, {
      method: "POST",
      body: item.audioBlob,
      headers: {
        'targetLang': `${audioTranlateLang}`,
      }
    })
    // .then(res => console.log(res.text()))
  })


  console.log(lowScoreList)
  lowScoreList = {}
}

function openForm() {
  document.querySelector(".form-popup").style.display = "block";
}

function closeForm() {
  document.querySelector(".form-popup").style.display = "none";
}

function bookingExchange(e) {
  let exchangeForm = document.forms.namedItem('exchangeForm');
  console.log(exchangeForm)
  exchangeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(exchangeForm);
    formData.append('room_id', talkTo.room_id);
    formData.append('publisher_id', user_id);
    formData.append('first_lang', user.native);
    formData.append('second_lang', user.learning);
    const checkBox = document.getElementById("noticing");
    if (formData.get('notice') === 'on') {
      formData.set('notice', 1);
    } else {
      formData.set('notice', 0);
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

const duration = 15 * 60 * 1000
const ratio = 50
let time = duration * ratio / 100;
let step = 1
let main = document.querySelector('main')
let currentLang = document.querySelector('#currentLang')
let timer = document.querySelector('#timer')
function startexchangeDemo() {
  startTime = Date.now();
  startSpeechRecognition()
  main.style = 'background:red'
  currentLang.textContent = `${speechRecognitionLearningLang} Time`
  MyCounter()
}

function MyCounter() {
  if (time <= 0) {
    if (step === 1) {
      swap()
    } else {
      stopexchangeDemo()
    }
  } else {
    timer.textContent = Math.floor(time / 1000 / 60) + " : " + time / 1000 % 60
    setTimeout(MyCounter, 1000);
  }
  time -= 1000;
}

function swap() {
  const langBuffer = speechRecognitionLearningLang
  speechRecognitionLearningLang = speechRecognitionNativeLang
  speechRecognitionNativeLang = langBuffer
  currentLang.textContent = `${speechRecognitionLearningLang} Time`
  main.style = 'background:blue'
  time = duration * (100 - ratio) / 100;
  recognition2.stop()
  MyCounter()
  step = 2
}

function stopexchangeDemo() {
  timer.textContent = ''
  stopSpeechRecognition()
  main.style = ''
  currentLang.textContent = ''
  timer.textContent = ''
}