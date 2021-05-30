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
let mediaRecorder

let textTranslatelang = 'en' //native lang
let audioTranlateLang = 'en-US' //native lang
let speechSynthesisLang = 'en-US' //text lang
let speechRecognitionLang = 'zh-TW' //target Lang when exchange 'zh-TW''en-US'

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
          const textElement = msgReplyBtn.parentNode.children[0]
          replyContent = document.importNode(textElement, true)
          if (msg.correct === 1) {
            let wrongString = replyContent.textContent.split('')
            let rightString = msg.content.split('')
            const result = patienceDiff(wrongString, rightString).lines

            let tempString = ''
            let isDetected = false
            const markedWrongSpans = document.createElement('div')
            console.log(result)
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
          const audioElement = msgReplyBtn.parentNode.children[1]
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
          console.log(result)
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
                tempElement.setAttribute('class', 'fix')
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
                  tempElement.setAttribute('class', 'fix')
                }
                markedRightSpans.appendChild(tempElement)
              }
            }

          })

          const originMsg = clone.querySelector('#originMsg')
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
        if (msg.content.data) {
          const buffer = msg.content.data
          var arrayBuffer = new ArrayBuffer(buffer.length);
          var view = new Uint8Array(arrayBuffer);
          buffer.map((b, i) => view[i] = b)
          msg.content = arrayBuffer
        }
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
  const replyBody = document.querySelector('#replyBody')
  if (replyBody) {
    historyId = replyBody.getAttribute('historyId')
    replyBody.lastChild.remove()
    document.querySelector('#replyTo').style = 'display:none'
  }

  let correct = false
  const userInput = document.querySelector('#input')
  if (userInput.hasAttribute('correct')) {
    correct = true
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
  console.log(data)
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
      const textElement = element.parentNode.children[0]
      clone = textElement.cloneNode('deep')
      break
    }
    case 'audio': {
      const audioElement = element.parentNode.children[1]
      clone = audioElement.cloneNode('deep')
      break
    }
  }

  const replyTo = document.querySelector('#replyTo')
  const sender = parseInt(element.getAttribute('sender'))
  const historyId = parseInt(element.getAttribute('historyId'))
  try {
    replyTo.querySelector('img').src = friendData[sender].picture
    replyTo.querySelector('span#senderName').textContent = friendData[sender].name
  } catch (e) {
    replyTo.querySelector('img').src = user.picture
    replyTo.querySelector('span#senderName').textContent = user.name
  }
  const replyBody = document.querySelector('#replyBody')
  replyBody.setAttribute('historyId', historyId)
  console.log(clone)
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
}

function correct(element) {
  const replyBtnElement = element.previousElementSibling
  const userInputBox = document.querySelector('#input')
  userInputBox.value = reply(replyBtnElement)
  userInputBox.setAttribute('correct', '')
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
})


const recordVoiceMsgBtn = document.querySelector('#recordVoiceMsgBtn')
recordVoiceMsgBtn.addEventListener('mousedown', (event) => {
  startAudioRecord()
  event.target.style = 'background: lightgrey'
})

recordVoiceMsgBtn.addEventListener('mouseup', (event) => {
  stopAudioRecord()
  event.target.style = 'background: rgba(45, 58, 56, 0.74)'
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
  }
  mediaRecorder = new MediaRecorder(cacheStream)
  mediaRecorder.start()
  const timeoutID = setTimeout(stopAudioRecord, 10 * 1000)

  let chunks = []
  mediaRecorder.ondataavailable = function (e) {
    chunks.push(e.data)
  }

  mediaRecorder.onstop = function (e) {
    clearTimeout(timeoutID)
    const blob = new Blob(chunks, { type: 'audio/ogg codecs=opus' })
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
  // on click diffenet friend, need render respective history
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

  const localVideo = document.getElementById('localVideo')
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
  const remoteVideo = document.querySelector("remoteVideo")
  if (event.streams.length !== 0 && remoteVideo.srcObject !== event.streams[0]) {
    remoteVideo.srcObject = event.streams[0]
  }
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

// translate text
function translateMsg(element) {
  const text = element.parentNode.querySelector('#content').textContent
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
      const translateMsg = element.parentNode.parentNode.children[1]
      const translateContent = translateMsg.querySelector('span')
      translateContent.textContent = res.data
      translateMsg.style = 'display: flex'
      // translateResult = element.parentNode.insertBefore(translateResult, element.parentNode.childNodes[1])
    })
  return
}

// translate audio
async function translateAudio(element) {
  const audio = element.parentNode.firstChild.getAttribute('src');

  fetch(audio)
    .then(res => res.blob()) // mixin takes a Response stream and reads it to completion.
    .then(blob => {
      console.log(blob)
      const data = {
        targetLang: audioTranlateLang,
        blob: blob
      }
      fetch(`/demoGoogleSpeechToTest`, {
        method: "POST",
        body: data
      })
        .then(res => console.log(res.text()))
    })
}

// speechSynthesis
function speakMsg(element) {
  const msgContent = element.parentNode.firstChild.textContent.split(':')[1]
  const targetLang = speechSynthesisLang //need change follow the Lang of this msg

  var synth = window.speechSynthesis
  var utterThis = new SpeechSynthesisUtterance(msgContent);
  utterThis.voice = synth.getVoices().find(voice => voice.lang === targetLang)
  synth.speak(utterThis);
}

var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;
var recognition = new SpeechRecognition();
recognition.lang = speechRecognitionLang
recognition.maxAlternatives = 1;
recognition.interimResults = true;
// recognition.continuous = true;
let voiceRecorder

function startSpeechRecognition() {
  recognition.start();

  recognition.onstart = async function (event) {
    console.log('[SpeechRecognition] recognition start');

    const voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true })

    voiceRecorder = new MediaRecorder(voiceStream)
    voiceRecorder.start()

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

  recognition.onaudiostart = function (event) {
    console.log('[SpeechRecognition] audio start');
  }

  recognition.onsoundstart = function (event) {
    console.log('[SpeechRecognition] sound start');
  }

  recognition.onspeechstart = function (event) {
    console.log('[SpeechRecognition] speechs tart');
  }

  recognition.onresult = function (event) {
    const resultList = event.results
    const lastIndex = resultList.length - 1
    const lastResult = resultList[lastIndex][0]
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

  recognition.onnomatch = function (event) {
    console.log('[SpeechRecognition] no match');
  }

  recognition.onspeechend = function () {
    console.log('[SpeechRecognition] speech end');
  }

  recognition.onsoundend = function (event) {
    console.log('[SpeechRecognition] sound end');
  }

  recognition.onaudioend = function (event) {
    console.log('[SpeechRecognition] audio end');
  }

  recognition.onend = function (event) {
    console.log('[SpeechRecognition] recognition end');
    recognition.start();
  }

  recognition.onerror = function (event) {
    console.log('[SpeechRecognition] error occurred: ' + event.error);
  }
}

function stopSpeechRecognition() {
  recognition.stop();

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
    formData.append('publisher_id', user_id);
    formData.append('first_lang', user.native);
    formData.append('second_lang', user.learning);
    const checkBox = document.getElementById("noticing");
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
