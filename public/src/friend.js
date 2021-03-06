'user strict'

const HOST_NAME = 'talktotheworld.online'
let socket
let user
let user_id
let friendData
let friendList
let talkTo
const historyData = {}

let localPeer
let tempCandidate = []
let localStream
let remoteStream
let mediaRecorder // new MediaRecorder(localStream) for voiceRecorder
let voiceRecorder // new MediaRecorder(localStream) for SpeechRecognition

let textTranslatelang //= 'en' //native lang
let audioTranlateLang //= 'en-US' //learning lang
let speechSynthesisLang //= 'en-US' //text lang
let speechRecognitionLearningLang //= 'en-US' //target Lang when exchange 'zh-TW''en-US'
let speechRecognitionNativeLang //= 'zh-TW'

const confidenceThreshold = 0.85
const voiceMsgLimit = 10 * 1000

async function renderMessage(msg) {
  const { sender } = msg
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
      clone.querySelector('#replyIcon').style = 'display:inline'
      switch (replyType) {
        case 'text': {
          const textElement = msgReplyBtn.parentNode.parentNode.querySelector('#originMsg #content')
          replyContent = document.importNode(textElement, true)
          if (msg.correct === 1) {
            clone.querySelector('#replyIcon').removeAttribute('style')
            const wrongString = replyContent.textContent.split('')
            const rightString = msg.content.split('')
            const result = patienceDiff(wrongString, rightString).lines
            let tempString = ''
            let isDetected = false
            const markedWrongSpans = document.createElement('span')
            markedWrongSpans.setAttribute('id', 'content')
            result.map((char, i) => {
              if (char.aIndex !== -1) {
                if (char.bIndex !== -1 && isDetected === false) {
                  tempString += char.line
                } else if (char.bIndex === -1 && isDetected === false) {
                  const tempElement = document.createElement('span')
                  tempElement.textContent = tempString
                  tempElement.setAttribute('class', 'pass')
                  markedWrongSpans.appendChild(tempElement)
                  tempString = `${char.line}`
                  isDetected = true
                } else if (char.bIndex === -1 && isDetected === true) {
                  tempString += char.line
                } else if (char.bIndex !== -1 && isDetected === true) {
                  const tempElement = document.createElement('span')
                  tempElement.textContent = tempString
                  tempElement.setAttribute('class', 'fix')
                  markedWrongSpans.appendChild(tempElement)
                  tempString = `${char.line}`
                  isDetected = false
                }
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
            })
            replyContent = markedWrongSpans
          }
          break
        }
        case 'audio': {
          const audioElement = msgReplyBtn.parentNode.parentNode.querySelector('#originMsg audio')
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
    const replyBtn = clone.querySelector('#reply')
    replyBtn.setAttribute('historyId', msg.id)
    replyBtn.setAttribute('senderId', msg.sender)
    replyBtn.setAttribute('contentType', msg.type)
    const timeSpan = clone.querySelector('#sendTime')
    timeSpan.textContent = showTime(msg.time)

    switch (msg.type) {
      case 'text': {
        // render correction
        if (msg.correct === 1) {
          const wrongString = replyContent.textContent.split('')
          const rightString = msg.content.split('')
          const result = patienceDiff(wrongString, rightString).lines

          let tempString = ''
          let isDetected = false
          let markedRightSpans = document.createElement('span')
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
                tempString = `${char.line}`
                isDetected = true
              } else if (char.aIndex === -1 && isDetected === true) {
                tempString += char.line
              } else if (char.aIndex !== -1 && isDetected === true) {
                const tempElement = document.createElement('span')
                tempElement.textContent = tempString
                tempElement.setAttribute('class', 'correction')
                markedRightSpans.appendChild(tempElement)
                tempString = `${char.line}`
                isDetected = false
              }
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
          })

          const originMsg = clone.querySelector('#originMsg')
          const textSpan = clone.querySelector('#originMsg #content')
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
        if (msg.content.data) {
          const buffer = msg.content.data
          const arrayBuffer = new ArrayBuffer(buffer.length)
          const view = new Uint8Array(arrayBuffer)
          buffer.map((b, i) => view[i] = b)
          msg.content = arrayBuffer
        }

        const audioBlob = new Blob([msg.content], { type: 'audio/opus' })
        const audio = clone.querySelector('audio')
        audio.setAttribute('style', 'display: block')
        audio.src = window.URL.createObjectURL(audioBlob)

        clone.querySelector('#translateMsgBtn').remove()
        clone.querySelector('#speakBtn').remove()
        clone.querySelector('#correctBtn').remove()
        clone.querySelector('#bufferBtn').remove()
        break
      }
      case 'exchange': {
        const sourceSpan = clone.querySelector('#originMsg #content')
        sourceSpan.setAttribute('class', 'systemMsg')
        sourceSpan.removeAttribute('hidden')
        sourceSpan.textContent = 'Language exchange started'
        clone.querySelector('#toolbar').remove()
      }
      case 'picture': {
        break
      }
    }

    const messages = document.querySelector('#messages')
    messages.append(clone)
    messages.scrollTop = messages.scrollHeight
  } else {
    console.log(sender)
    try {
      const user_box = document.querySelector(`div[id='${sender}']`)
      const count = user_box.querySelector('.count')
      const num = count.textContent
      const count_circle = user_box.querySelector('.count-circle')
      count_circle.style = 'display: flex'
      count.textContent = parseInt(num) + 1
    } catch (error) {
      console.log(error)
    }
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
      correct,
      room: talkTo.room_id,
      sender: user_id,
      type,
      content
    }
  }
  socket.emit('message', data)
}

// reply message
function reply(element) {
  // remove old replyTo
  const testContent = document.querySelector('#replyTo #content')
  const audioContent = document.querySelector('#replyTo audio')
  if (testContent) {
    testContent.remove()
  }
  if (audioContent) {
    audioContent.remove()
  }

  // check the new reply contentType
  const type = element.getAttribute('contentType')
  let clone
  switch (type) {
    case 'text': {
      const textElement = element.parentNode.parentNode.querySelector('#originMsg #content')
      clone = textElement.cloneNode('deep')

      // for correct, merge spans into a single span
      if (clone.tagName = 'div') {
        const span = document.createElement('span')
        span.id = 'content'
        span.textContent = clone.innerText
        clone = span
      }
      break
    }
    case 'audio': {
      const audioElement = element.parentNode.parentNode.querySelector('#originMsg audio')
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
  } catch (error) {
    console.log(error)
    replyTo.querySelector('img').src = user.picture
    replyTo.querySelector('span#senderName').textContent = user.name
  }
  const replyBody = document.querySelector('#replyBody')
  const messages = document.querySelector('#messages')
  messages.style = 'max-height: 59vh'
  replyBody.setAttribute('historyId', historyId)
  replyBody.append(clone)
  replyTo.style = 'display:flex'

  // return for correct
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
  messages.style = 'max-height: 89vh'
  const userInputBox = document.querySelector('#input')
  userInputBox.value = null
}

function correct(element) {
  const replyBtnElement = element.previousElementSibling
  const userInputBox = document.querySelector('#input')
  userInputBox.value = reply(replyBtnElement)
  userInputBox.setAttribute('correct', '')
}

function favorite(element) {
  history_id = element.parentNode.querySelector('#reply').getAttribute('historyId')
  const data = { user_id, history_id }
  socket.emit('favorite', data)
  Swal.fire('Add to your collection!')
}

// text message function
const form = document.forms.textInput
form.addEventListener('submit', (e) => {
  e.preventDefault()

  const input = document.getElementById('input')
  const userinput = input.value

  if (userinput) {
    sendMessage('text', userinput)
    input.value = ''
  }
  const messages = document.querySelector('#messages')
  messages.style = 'max-height: 89vh'
})

// audio message function
let timeoutID
let isRecording = false
const recordVoiceMsgBtn = document.querySelector('#recordVoiceMsgBtn')
recordVoiceMsgBtn.addEventListener('mousedown', (event) => {
  isRecording = true
  startAudioRecord()
  event.target.style = `
  background: rgb(57, 70, 77);
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2), 0 2px 4px 0 rgba(0, 0, 0, 0.19)`
})

async function startAudioRecord() {
  const voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true })
  mediaRecorder = new MediaRecorder(voiceStream)
  mediaRecorder.start()
  timeoutID = setTimeout(stopAudioRecord, voiceMsgLimit)

  let chunks = []
  mediaRecorder.ondataavailable = function (e) {
    chunks.push(e.data)
  }

  mediaRecorder.onstop = function (e) {
    const blob = new Blob(chunks, { type: 'audio/opus' })
    sendMessage('audio', blob)
    voiceStream.getTracks().forEach((track) => { track.stop() })
    clearTimeout(timeoutID)
    chunks = []
  }
}

// after starting recording voice message
// no mater mouse up event happend on anywhere
// the recording should stop
window.onmouseup = () => {
  if (isRecording === true) {
    document.querySelector('#recordVoiceMsgBtn').style = `
    background: rgba(45, 58, 56, 0.74)
    box-shadow: none`
    stopAudioRecord()
    isRecording = false
  }
}

const stopAudioRecord = () => {
  mediaRecorder.stop()
  clearTimeout(timeoutID)
}

async function renderHistory(element) {
  // when click on userBox, change talkTo to this user
  if (element) {
    talkTo = friendData[element.id]

    // check whether has a call with this user or not
    // decide to remove the backgound of chat Box or not
    // remove userbox checked attribute for background color change
    if (element.querySelector('svg').hasAttribute('style')) {
      document.querySelector('#chatBox').style.background = 'none'
    } else {
      document.querySelector('#chatBox').removeAttribute('style')
    }
  }

  // remove the pre-checked userbox's checked attribute
  const checkedUserBox = document.querySelector('div.user_box[checked]')
  if (checkedUserBox) {
    checkedUserBox.removeAttribute('checked')
  }

  // set background to the box of talkTo user
  const user_box = document.querySelector(`div[id='${talkTo.user_id}']`)
  user_box.setAttribute('checked', '')

  // clear ex-history
  document.querySelector('#messages').textContent = ''

  // inform server that user has leave certain room number
  socket.emit('leaveRoom', { user_id, room: talkTo.room_id })

  // inform server that user has join to certain room number
  socket.emit('joinRoom', { user_id, room: talkTo.room_id })

  // render talkTo's data to the friendDetailBox
  document.querySelector('#friendPicture').setAttribute('src', talkTo.picture)
  document.querySelector('#friendEmail').textContent = talkTo.email
  document.querySelector('#friendName').textContent = talkTo.name
  document.querySelector('#friendNative').textContent = langCodePair[talkTo.native]
  document.querySelector('#friendLearning').textContent = langCodePair[talkTo.learning]
  document.querySelector('#friendInterest').textContent = talkTo.interest
  document.querySelector('#friendIntroduction').textContent = talkTo.introduction

  // clear the unread message number
  const count = user_box.querySelector('.count')
  if (count.textContent !== '0') {
    user_box.querySelector('.count-circle').style = 'display: none'
    count.textContent = 0
    const data = [talkTo.user_id, talkTo.room_id]
    socket.emit('readMessage', data)
  }

  // get the history then render it
  fetch(`/chat/history?room=${talkTo.room_id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${window.localStorage.getItem('JWT')}` }
  }).then((res) => res.json())
    .then((res) => {
      res.map((msg) => {
        renderMessage(msg)
      })
    })
}

// first come into this page
fetch('/chat/friend', {
  method: 'GET',
  headers: { Authorization: `Bearer ${window.localStorage.getItem('JWT')}` }
}).then((res) => res.json())
  .then((res) => {
    isResponseHasError(res)
    user = res.user
    user_id = res.user.user_id
    textTranslatelang = user.native
    audioTranlateLang = user.learning
    speechSynthesisLang = user.learning

    if (res.data.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Your Friend List is Empty',
        html: '<span style=font-size:x-large>Go to Explore!<span>',
        confirmButtonText: 'OK'
      }).then((res) => {
        if (res.isConfirmed) {
          window.location = '/profile.html'
        }
      })
    } else {
      friendList = res.data
      friendData = {}
      friendList.map((item) => friendData[item.user_id] = item)

      socket = io({
        auth: {
          user_id
        }
      })

      // render myProfile
      document.querySelector('img#myPicture').src = user.picture
      document.querySelector('span#myName').textContent = user.name

      // render friend list
      const template = document.querySelector('#uerBoxTemplate').content
      const friend_list = document.querySelector('#friend-list')
      friendList.forEach((user) => {
        const clone = document.importNode(template, true)
        clone.querySelector('.user_box').id = user.user_id
        clone.querySelector('img').setAttribute('src', user.picture)
        clone.querySelector('#name').textContent = user.name
        const { unread } = user
        if (unread > 0) {
          clone.querySelector('.count-circle').style = 'display: flex'
          clone.querySelector('.count').textContent = unread
        }
        friend_list.append(clone)
      })

      // set room as the global variable
      const params = (new URL(document.location)).searchParams
      const room = parseInt(params.get('room'))
      const exchange_id = parseInt(params.get('exchange_id'))

      // decide talk to whom and collect data
      if (!room) {
        talkTo = friendList[0]
      } else {
        friendList.map((friend) => {
          if (friend.room_id === room) {
            talkTo = friend
          }
        })
      }

      if (exchange_id) {
        Swal.fire({
          title: 'You are ready to start',
          text: 'Waiting for your friend',
          icon: 'info'
        })

        const exchange = JSON.parse(window.localStorage.getItem(`exchange_${exchange_id}`))
        socket.emit('readyToStart', { user_id, exchange })
      }

      // render popup form
      document.querySelector('#first-lang').textContent = langCodePair[user.native]
      document.querySelector('#second-lang').textContent = langCodePair[user.learning]

      const start_time_input = document.querySelector('#start_time_input')
      const rightNow = new Date()
      const year = rightNow.getFullYear()
      function fillZero(num) { return num < 10 ? `0${num}` : num }
      const month = fillZero(rightNow.getMonth() + 1)
      const date = fillZero(rightNow.getDate())
      const hours = fillZero(rightNow.getHours())
      const minutes = fillZero(rightNow.getMinutes())
      const ISOTime = `${year}-${month}-${date}T${hours}:${minutes}`
      start_time_input.min = ISOTime
      start_time_input.value = ISOTime

      renderHistory()

      socket.emit('joinRoom', { user_id, room: talkTo.room_id })

      socket.on('connect', () => {
        console.log('[socket] connect')
      })

      socket.on('disconnect', () => {
        console.log('[socket] disconnect')
      })

      socket.on('joinRoom', ({ user_id, room }) => {
        console.log(`[Room] ${user_id} join ${room}`)
      })

      socket.on('leaveRoom', (data) => {
        console.log(`[Room] ${data} leave`)
      })

      socket.on('message', renderMessage)

      // P2P
      socket.on('offer', handleSDPOffer)
      socket.on('answer', handleSDPAnswer)
      socket.on('icecandidate', handleNewIceCandidate)
      socket.on('hangup', handleHangup)
      socket.on('callend', handleCallEnd)

      // notice.js
      socket.on('friend_online', online_notice)
      socket.on('waitingInvite', renderWaitingIvite)
      socket.on('inviteAccepted', handleInviteAccepted)

      socket.on('beforeExchangeStart', beforeExchangeStart)
      socket.on('exchangePreStart', exchangePreStart)

      socket.on('exchangeInvite', handleExchangeInvite)
      socket.on('exchangeInviteAccepted', handleExchangeInviteAccepted)
      socket.on('exchangeInviteRejected', handleExchangeInviteRejected)

      // Exchange
      socket.on('exchangeStart', exchangeStart)
      socket.on('startTimer', startTimer)
      socket.on('triggerExchange', callBtn)
      socket.on('saveCollectSuccess', redirectToRoomInURL)
    }
  })

async function micBtn(element) {
  const activeIcon = element.querySelector('svg[style]').id
  const unmuteIcon = element.querySelector('#unmuteIcon')
  const muteIcon = element.querySelector('#muteIcon')
  if (activeIcon === 'muteIcon') {
    muteIcon.removeAttribute('style')
    unmuteIcon.style = 'display:inline'
    localStream.getAudioTracks().map((track) => track.enabled = true)
  } else if (activeIcon === 'unmuteIcon') {
    unmuteIcon.removeAttribute('style')
    muteIcon.style = 'display: inline'
    localStream.getAudioTracks().map((track) => track.enabled = false)
  }
}

let exchangeData
let duration
let ratio
let time
let startTime
let conterIntervalId
let step = 0 // exchange step
let history_id

const exchangeStart = ({ exchange_id, startExchangeTime, msg }) => {
  step = 1
  console.log(msg)
  history_id = msg.id
  console.log(history_id)
  renderMessage(msg) // system message
  exchangeData = JSON.parse(window.localStorage.getItem(`exchange_${exchange_id}`))
  duration = exchangeData.duration * 60
  ratio = exchangeData.ratio
  time = duration * ratio / 100
  startTime = new Date(startExchangeTime).valueOf()

  document.querySelector('#chat-box-head').style = 'display:flex'
  document.querySelector('#chat-box-head').setAttribute('part', 'I')
  document.querySelector('#currentLang').textContent = `Part I : ${langCodePair[exchangeData.first_lang]}`

  // use to decide whether to open the recognition or not
  if (exchangeData.first_lang === user.learning) {
    startSpeechRecognition()
  }
}

const startTimer = () => {
  // when on exchange step 1, start the timer
  if (step === 1 && !conterIntervalId) {
    conterIntervalId = window.setInterval(counter, 1000)
  }
}

function counter() {
  if (time >= 0 && step !== 0) {
    const min = fillZero(Math.floor(time / 60))
    const sec = fillZero(time % 60)
    document.querySelector('#timer').textContent = `${min} : ${sec}`
  } else {
    window.clearInterval(conterIntervalId)
    conterIntervalId = null
    if (step === 1) {
      swap() // swap to step2
    } else {
      stopExchange() // stop exchange
    }
  }
  time -= 1
}

function swap() {
  step = 2
  if (exchangeData.second_lang === user.learning) {
    startSpeechRecognition()
  } else {
    recognition.stop()
    voiceRecorder.stop()
  }

  document.querySelector('#chat-box-head').setAttribute('part', 'II')
  document.querySelector('#currentLang').textContent = `Part II : ${langCodePair[exchangeData.second_lang]}`

  time = duration * (100 - ratio) / 100
  conterIntervalId = window.setInterval(counter, 1000)
}

async function stopExchange() {
  // show the recored voice file
  const lowScoreArray = Object.values(lowScoreList)
  if (lowScoreArray.length > 0) {
    const htmlHolder = document.createElement('div')
    const tableContainer = document.createElement('div')
    tableContainer.setAttribute('id', 'tableContainer')
    const title = document.createElement('div')
    title.setAttribute('id', 'titleContainer')
    const timeResult = document.createElement('span')
    timeResult.setAttribute('class', 'titleItem')
    timeResult.textContent = 'Time'
    title.append(timeResult)
    const contentResult = document.createElement('span')
    contentResult.setAttribute('class', 'titleItem')
    contentResult.setAttribute('id', 'contentTitle')
    contentResult.textContent = 'Content'
    title.append(contentResult)
    const scoreResult = document.createElement('span')
    scoreResult.setAttribute('class', 'titleItem')
    scoreResult.setAttribute('id', 'scoreTitle')
    scoreResult.textContent = 'Score'
    title.append(scoreResult)
    const collectResult = document.createElement('span')
    collectResult.setAttribute('class', 'titleItem')
    collectResult.setAttribute('id', 'collectTitle')
    collectResult.textContent = 'Collect'
    title.append(collectResult)
    tableContainer.append(title)

    const listContainer = document.createElement('div')
    listContainer.setAttribute('id', 'listContainer')
    lowScoreArray.map((lowScore, i) => {
      const listItem = document.createElement('div')
      listItem.setAttribute('class', 'listItem')
      const timeBox = document.createElement('div')
      timeBox.setAttribute('class', 'timeBox')
      timeBox.textContent = lowScore.timing
      listItem.append(timeBox)
      const contentBox = document.createElement('div')
      contentBox.setAttribute('class', 'contentBox')
      const transcript = document.createElement('span')
      transcript.textContent = lowScore.transcript
      contentBox.append(transcript)
      const audio = document.createElement('audio')
      audio.setAttribute('controls', '')
      audio.src = lowScore.audioUrl
      contentBox.append(audio)
      listItem.append(contentBox)
      const scoreBox = document.createElement('div')
      scoreBox.setAttribute('class', 'scoreBox')
      scoreBox.textContent = lowScore.confidence
      listItem.append(scoreBox)
      const checkBox = document.createElement('input')
      checkBox.setAttribute('class', 'checkBox')
      checkBox.setAttribute('id', `swal-input${i}`)
      checkBox.setAttribute('type', 'checkbox')
      listItem.append(checkBox)
      // checkBox.setAttribute('name', `${i}`)
      listContainer.append(listItem)
    })
    tableContainer.append(listContainer)
    htmlHolder.append(tableContainer)

    // ask user that which of those should be saved
    const { value: formValues } = await Swal.fire({
      title: 'Exchange Finish',
      html: htmlHolder.innerHTML,
      focusConfirm: false,
      preConfirm: () => {
        collectList = []
        lowScoreArray.map((lowScore, i) => {
          if (document.getElementById(`swal-input${i}`).checked === true) {
            collectList.push(lowScore)
          }
        })
        return collectList
      }
    })

    if (formValues) {
      const data = []
      formValues.map((item) => {
        const collect = {
          exchange_id: exchangeData.id,
          user_id,
          timing: item.timing,
          audio: item.audioBlob,
          transcript: item.transcript,
          confidence: item.confidence
        }
        data.push(collect)
      })

      await socket.emit('saveCollect', data)
      await socket.emit('favorite', { user_id, history_id })
      lowScoreList = {}
      initExchangeEnvironment()
      closing()
      initCallBtn()
    }
  } else {
    Swal.fire({
      icon: 'success',
      title: 'Exchange Finish',
      html: '<span style=font-size:x-large>Well Done, your pronunciation is very good!<span>',
      confirmButtonText: 'OK'
    }).then((res) => {
      if (res.isConfirmed) {
        finishExchange()
      }
    })
  }
}

var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent
var recognition = new SpeechRecognition()
let lowScoreList = {}

// let startTime
let startPt
const isNeedStoreCheck = {}

async function startSpeechRecognition() {
  if (!voiceRecorder) {
    const voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    voiceRecorder = new MediaRecorder(voiceStream)
  }
  voiceRecorder.start()

  let chunks = []
  voiceRecorder.ondataavailable = async function (e) {
    chunks.push(e.data)
  }

  let voiceRecorderCounter = 0
  voiceRecorder.onstop = function (e) {
    voiceRecorderCounter++
    if (isNeedStoreCheck[voiceRecorderCounter] === true) {
      const blob = new Blob(chunks, {
        type: 'audio/opus'
      })
      const audioUrl = window.URL.createObjectURL(blob)
      if (!lowScoreList[recognitionCounter]) {
        lowScoreList[recognitionCounter] = {}
      }
      lowScoreList[voiceRecorderCounter].audioBlob = blob
      lowScoreList[voiceRecorderCounter].audioUrl = audioUrl
    }
    chunks = []
  }

  if (step === 1) {
    recognition.lang = exchangeData.first_lang
  } else {
    recognition.lang = exchangeData.second_lang
  }
  recognition.maxAlternatives = 1
  recognition.interimResults = false

  recognition.start()

  recognition.onstart = function (event) {
    console.log('[SpeechRecognition] recognition start')
  }

  recognition.onaudiostart = function (event) {
    console.log('[SpeechRecognition] audio start')
  }

  recognition.onsoundstart = function (event) {
    console.log('[SpeechRecognition] sound start')
  }

  recognition.onspeechstart = function (event) {
    console.log('[SpeechRecognition] speechs tart')
  }

  let recognitionCounter = 0
  recognition.onresult = async function (event) {
    const resultList = event.results
    const lastResult = resultList[resultList.length - 1]
    const alternative = lastResult[0]
    // console.log(event.results)
    // console.log('Confidence: ' + alternative.confidence + '\n' + alternative.transcript.toLowerCase());

    if (lastResult.isFinal === true) {
      if (voiceRecorder.status !== 'inactive') {
        voiceRecorder.stop()
      }
      voiceRecorder.start()
      recognitionCounter++
      if (alternative.confidence < confidenceThreshold) {
        isNeedStoreCheck[recognitionCounter] = true

        const millisToMinutesAndSeconds = (millis) => {
          const minutes = Math.floor(millis / 60000)
          const seconds = ((millis % 60000) / 1000).toFixed(0)
          return `${minutes}:${(seconds < 10 ? '0' : '')}${seconds}`
        }

        const endTime = Date.now()
        const timing = millisToMinutesAndSeconds(endTime - startTime)
        const { transcript } = alternative
        const confidence = Math.floor(alternative.confidence * 100)

        if (!lowScoreList[recognitionCounter]) {
          lowScoreList[recognitionCounter] = {}
        }
        lowScoreList[recognitionCounter].timing = timing
        lowScoreList[recognitionCounter].transcript = transcript
        lowScoreList[recognitionCounter].confidence = confidence
      }
    }
  }

  recognition.onnomatch = function (event) {
    console.log('[SpeechRecognition] no match')
  }

  recognition.onspeechend = function () {
    console.log('[SpeechRecognition] speech end')
  }

  recognition.onsoundend = function (event) {
    console.log('[SpeechRecognition] sound end')
  }

  recognition.onaudioend = function (event) {
    console.log('[SpeechRecognition] audio end')
  }

  recognition.onend = function (event) {
    console.log('[SpeechRecognition] recognition end')
    if (voiceRecorder.state !== 'inactive') {
      recognition.start()
    }
  }

  recognition.onerror = function (event) {
    console.log(`[SpeechRecognition] error occurred: ${event.error}`)
  }
}

async function callBtn() {
  const callBtn = document.querySelector('#callBtn')
  const hiddenIcon = callBtn.querySelector('svg[style]').id
  const callIcon = callBtn.querySelector('#callIcon')
  const hangUpIcon = callBtn.querySelector('#hangUpIcon')
  const micBtn = document.querySelector('#micBtn')
  const cameraBtn = document.querySelector('#cameraBtn')
  if (hiddenIcon === 'hangUpIcon') {
    if (!await calling()) {
      callBtn.style = 'background:rgb(237,27,36)'
      hangUpIcon.removeAttribute('style')
      callIcon.style = 'display: none'
      micBtn.style = 'display:inline-block'
      cameraBtn.style = 'display:inline-block'
    }
  } else if (hiddenIcon === 'callIcon') {
    socket.emit('callend', talkTo.room_id)
    initExchangeEnvironment()
    closing()
    initCallBtn()
    redirectToRoomInURL()
  }
}

async function cameraBtn(element) {
  const activeIcon = element.querySelector('svg[style]').id
  const cameraOn = element.querySelector('#cameraOn')
  const cameraOff = element.querySelector('#cameraOff')
  if (activeIcon === 'cameraOn') {
    cameraOn.removeAttribute('style')
    cameraOff.style = 'display: inline'
    localStream.getVideoTracks().map((track) => track.enabled = false)
  } else if (activeIcon === 'cameraOff') {
    cameraOff.removeAttribute('style')
    cameraOn.style = 'display: inline'
    localStream.getVideoTracks().map((track) => track.enabled = true)
  }
}

const renderSetting = (videoConstraints) => {
  if (videoConstraints.audio === false && videoConstraints.video === false) {
    throw new Error('Need one input at least')
  }

  if (videoConstraints.audio === true) {
    document.querySelector('#unmuteIcon').style = 'display:inline'
  } else {
    document.querySelector('#muteIcon').style = 'display:inline'
  }

  if (videoConstraints.video === true) {
    document.querySelector('#cameraOn').style = 'display:inline'
  } else {
    document.querySelector('#cameraOff').style = 'display:inline'
  }
}

function swapVideo(element) {
  const clickedOne = element.id
  const mainVideo = document.querySelector('#mainVideo')
  if (clickedOne === 'myVideo') {
    mainVideo.setAttribute('muted', '')
    const friendVideo = document.querySelector('#friendVideo')
    friendVideo.srcObject = mainVideo.srcObject
    friendVideo.style = 'display:block'
  } else if (clickedOne === 'friendVideo') {
    mainVideo.removeAttribute('muted')
    const myVideo = document.querySelector('#myVideo')
    myVideo.srcObject = mainVideo.srcObject
    myVideo.style = 'display:block'
  }
  mainVideo.srcObject = element.srcObject
  element.srcObject = null
  element.removeAttribute('style')
}

async function calling() {
  try {
    if (!localPeer) {
      await createPeerConnection()
    }
    const videoConstraints = await settingVideoConstraints()
    renderSetting(videoConstraints)
    addStreamProcess(videoConstraints)
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text: error.message
    })
    closing()
    initExchangeEnvironment()
    return error
  }
  return null
}

function closing() {
  // Disconnect all our event listeners we don't want stray events to interfere with the hangup while it's ongoing.
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
  document.getElementById('chatBox').removeAttribute('style')

  const arr = ['#mainVideo', '#myVideo', '#friendVideo']
  arr.map((video) => {
    const vedeoElement = document.querySelector(video)
    vedeoElement.srcObject = null
    vedeoElement.removeAttribute('style')
  })

  if (localStream) {
    localStream.getTracks().forEach((track) => { track.stop() })
  }
  if (remoteStream) {
    remoteStream.getTracks().forEach((track) => { track.stop() })
  }

  // Close the peer connection
  localPeer.close()
  localPeer = null
  localStream = null
  remoteStream = null

  // hidden the camera icon on the user_box
  const cameraIconOnUserBox = document.querySelector('.user_box svg[style]')
  if (cameraIconOnUserBox) {
    cameraIconOnUserBox.removeAttribute('style')
  }
}

// utils
async function createPeerConnection() {
  localPeer = new RTCPeerConnection({
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302'
      },
      {
        urls: 'turn:192.158.29.39:3478?transport=udp',
        credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
        username: '28224511:1379330808'
      },
      {
        urls: 'turn:192.158.29.39:3478?transport=tcp',
        credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
        username: '28224511:1379330808'
      }
    ]
  })
  localPeer.onicecandidate = handleIceCandidate
  localPeer.onnegotiationneeded = handleNegotiationNeeded
  localPeer.ontrack = handleRemoteStream
}

function handleIceCandidate(event) {
  if (event.candidate) {
    console.log(`*** [WebRTC] find new ICE candicate ${event.candidate.candidate}`)
    socket.emit('icecandidate', { room: talkTo.room_id, candidate: event.candidate })
  }
}

// socket.on('icecandidate', handleNewIceCandidate)

async function handleNewIceCandidate({ room, candidate }) {
  try {
    if (!localPeer) {
      createPeerConnection()
    } else if (!localPeer.remoteDescription) {
      console.log("*** [WebRTC] can't find remoteDescription in peer")
      tempCandidate.push(candidate)
    } else {
      await localPeer.addIceCandidate(candidate)
      console.log(`*** [WebRTC] add ICE candidate: ${JSON.stringify(candidate.candidate)}`)
    }
  } catch (error) {
    console.log(`*** [WebRTC] fail to add ICE candidate: ${error.toString()}`)
  }
}

async function getUserStream(constraints) {
  localStream = await navigator.mediaDevices.getUserMedia(constraints)
}

async function addStreamProcess(constraints) {
  try {
    await getUserStream({ audio: true, video: true })
  } catch (error) {
    throw new Error(`*** [WebRTC] get User Stream error: ${error.toString()}`)
  }

  localStream.getTracks().map((track) => {
    if (track.kind === 'video') {
      track.enabled = constraints.video
    }
    if (track.kind === 'audio') {
      track.enabled = constraints.audio
    }
  })
  const myVideo = document.querySelector('#myVideo')
  myVideo.srcObject = localStream
  myVideo.style = 'display:block'

  try {
    localStream
      .getTracks()
      .forEach((track) => localPeer.addTrack(track, localStream)) // triggers renegotiation by firing a negotiationneeded event
  } catch (error) {
    throw new Error(`*** [WebRTC] Peer add Track error: ${error.toString()}`)
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
    socket.emit('offer', data)// ........................................................................................................................
  } catch (error) {
    console.log(`*** [WebRTC] failed to create offer: ${error.toString()}`)
    console.log(`*** [WebRTC] Error ${error.name}: ${error.message}`)
  }
}

// socket.on('offer', handleSDPOffer)

async function handleSDPOffer(data) {
  console.log('*** [WebRTC] receive offer')
  Swal.fire({
    title: `${friendData[data.sender].name} is calling you`,
    text: 'Do you want to pick the phone?',
    icon: 'question',
    showDenyButton: true,
    denyButtonText: 'No',
    confirmButtonText: 'Yes'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        if (!localPeer) {
          await createPeerConnection()
        }
        await localPeer.setRemoteDescription(data.offer)
        console.log('*** [WebRTC] set Remote Description ...')

        if (tempCandidate.length > 0) {
          tempCandidate.map(async (candidate) => {
            await localPeer.addIceCandidate(candidate)
            console.log(`*** [WebRTC] add ICE candidate: ${JSON.stringify(candidate.candidate)}`)
          })
          tempCandidate = []
        }

        if (!localStream) {
          const videoConstraints = await settingVideoConstraints()
          renderSetting(videoConstraints)

          const callBtn = document.querySelector('#callBtn')
          const callIcon = document.querySelector('#callIcon')
          const hangUpIcon = document.querySelector('#hangUpIcon')
          callBtn.style = 'background:rgb(237,27,36)'
          callIcon.style = 'display: none'
          hangUpIcon.removeAttribute('style')
          const arr = ['#micBtn', '#cameraBtn']
          arr.map((btn) => document.querySelector(btn).style = 'display:inline-block')

          await addStreamProcess(videoConstraints)
        }

        // //when on exchange step 1, start the timer
        // if (step === 1) {
        //   conterIntervalId = window.setInterval(counter, 1000);
        // }
      } catch (error) {
        console.log(`*** [WebRTC] Failed to create answer: ${error.toString()}`)
      }
      await createAnswer(data)
    } else if (result.isDenied) {
      socket.emit('hangup', data)
      initExchangeEnvironment()

      Swal.fire({
        title: 'Cancelled',
        text: 'Hang up the call',
        icon: 'error',
        confirmButtonText: 'OK'
      }).then((res) => {
        if (res.isConfirmed) {
          redirectToRoomInURL()
        }
      })
    }
  })
}

const handleHangup = (data) => {
  initExchangeEnvironment()
  closing()
  initCallBtn()

  Swal.fire({
    icon: 'error',
    title: 'Oops...',
    text: 'The call is hanged up',
    confirmButtonText: 'OK'
  }).then((res) => {
    if (res.isConfirmed) {
      redirectToRoomInURL()
    }
  })
}

function initCallBtn() {
  const callBtn = document.querySelector('#callBtn')
  const callIcon = document.querySelector('#callIcon')
  const hangUpIcon = document.querySelector('#hangUpIcon')
  const micBtn = document.querySelector('#micBtn')
  const cameraBtn = document.querySelector('#cameraBtn')
  callBtn.style = 'background:rgb(2,77,252);'
  callIcon.removeAttribute('style')
  hangUpIcon.style = 'display: none'
  micBtn.removeAttribute('style')
  cameraBtn.removeAttribute('style')
}

async function createAnswer(data) {
  try {
    console.log('*** [WebRTC] create Answer ...')
    const answer = await localPeer.createAnswer()
    console.log('*** [WebRTC] set Local Description ...')
    await localPeer.setLocalDescription(answer)
    console.log('*** [WebRTC] signaling answer ...')
    data.answer = answer
    socket.emit('answer', data)
  } catch (error) {
    console.log(`*** [WebRTC] Create Answer error: ${error.toString()}`)
  }
}

// socket.on('answer', handleSDPAnswer)

async function handleSDPAnswer(data) {
  console.log('*** [WebRTC] receive answer')
  try {
    console.log('*** [WebRTC] set Remote Description ...')
    await localPeer.setRemoteDescription(data.answer)
    if (tempCandidate.length > 0) {
      tempCandidate.map(async (candidate) => {
        await localPeer.addIceCandidate(candidate)
        console.log(`*** [WebRTC] add ICE candidate: ${JSON.stringify(candidate.candidate)}`)
      })
      tempCandidate = []
    }
  } catch (error) {
    console.log(`*** [WebRTC] Error ${error.name}: ${error.message}`)
  }
}

async function handleRemoteStream(event) {
  console.log('*** [WebRTC] render remote stream')
  remoteStream = event.streams[0]
  console.log(remoteStream.getTracks())
  const mainVideo = document.querySelector('#mainVideo')
  mainVideo.srcObject = remoteStream

  const params = (new URL(document.location)).searchParams
  const exchange_id = parseInt(params.get('exchange_id'))
  if (exchange_id) {
    socket.emit('getRemoteStream', { exchange_id, user_id })
  }

  // remove the background to show the main video
  const chatbox = document.querySelector('#chatBox')
  chatbox.style = 'background:none'

  // show the camera icon on the friend box who you are talking to
  document.querySelector(`div[id='${talkTo.user_id}'] svg`).style.display = 'inline'
}

function handleCallEnd() {
  initExchangeEnvironment()
  closing()
  initCallBtn()

  Swal.fire({
    title: 'Call ended',
    text: 'Your friend ended this call',
    icon: 'info',
    confirmButtonText: 'OK'
  }).then((res) => {
    if (res.isConfirmed) {
      redirectToRoomInURL()
    }
  })
}

async function settingVideoConstraints() {
  const { value: formValues } = await Swal.fire({
    title: 'Set the environment',
    html:
      'Camera:<input type = "checkbox" style="height:1rem;" id="swal-input1" class="swal2-input">'
      + '<br>'
      + 'Microphone:<input type = "checkbox" style="height:1rem" id="swal-input2" class="swal2-input" value = true >',
    focusConfirm: false,
    icon: 'question',
    preConfirm: () => {
      const isCamera = document.getElementById('swal-input1')
      const isVoice = document.getElementById('swal-input2')
      const videoConstraints = {}
      videoConstraints.video = !!isCamera.checked
      videoConstraints.audio = !!isVoice.checked
      return videoConstraints
    }
  })
  if (formValues) {
    return formValues
  }
}

// translate text
function translateMsg(element) {
  const historyId = parseInt(element.parentNode.querySelector('#reply').getAttribute('historyId'))
  const text = element.parentNode.parentNode.querySelector('#originMsg #content').innerText
  const target = textTranslatelang // need change follow the user's native zh-TWen-US
  const data = {
    historyId,
    text,
    target
  }
  fetch('/google/translate', {
    method: 'POST',
    headers: {
      Authorization: window.localStorage.getItem('JWT'),
      'Content-Type': 'application/JSON'
    },
    body: JSON.stringify(data)
  }).then((res) => res.json())
    .then((res) => {
      const translateMsg = element.parentNode.parentNode.querySelector('#translateMsg')
      const translateContent = translateMsg.querySelector('#content')
      translateContent.textContent = res.data
      translateMsg.style = 'display: flex'
    })
}

// translate audio
async function translateAudio(element) {
  const translateMsg = element.parentNode.parentNode.parentNode.querySelector('#translateMsg')
  translateMsg.style.display = 'flex'
  const content = translateMsg.querySelector('#content')
  content.textContent = 'Creating...'
  content.style = 'font-size:small;font-weight:400'

  const audio = element.parentNode.parentNode.querySelector('#originMsg audio').src
  const history_id = parseInt(element.parentNode.querySelector('#reply').getAttribute('historyid'))
  console.log(history_id) // check
  fetch(audio)
    .then((res) => res.blob())
    .then((blob) => {
      fetch('/google/transcript', {
        method: 'POST',
        body: blob,
        headers: {
          Authorization: window.localStorage.getItem('JWT'),
          targetLang: audioTranlateLang + ',' + history_id,
        }
      })
        .then((res) => res.json())
        .then((res) => {
          if (res.error) {
            translateMsg.style.display = 'none'
            Swal.fire({
              icon: 'error',
              title: 'Not supported recording format',
              text: res.error
            })
          } else {
            content.removeAttribute('style')
            content.textContent = res.transcript
          }
        })
    })
}

let voices // once the window loaded, once grab new voice, assign to voices
const { speechSynthesis } = window
speechSynthesis.onvoiceschanged = () => {
  voices = speechSynthesis.getVoices()
}

// speechSynthesis
async function speakMsg(element) {
  const msgContent = element.parentNode.parentNode.querySelector('#originMsg #content').innerText
  const targetLang = speechSynthesisLang // need change follow the Lang of this msg
  try {
    const utterThis = new SpeechSynthesisUtterance(msgContent)
    utterThis.voice = voices.find((voice) => voice.lang === targetLang)
    speechSynthesis.speak(utterThis)
  } catch (error) {
    console.log(error)
  }
}

function openForm() {
  document.querySelector('.form-popup').style.display = 'flex'
}

function closeForm() {
  document.querySelector('.form-popup').style.display = 'none'
}

const startTimeInput = document.querySelector('#start_time_input')
startTimeInput.onclick = function (event) {
  document.querySelector('#setTime').style.display = 'block'
}

const setTime = document.querySelector('#setTime')
setTime.onclick = function (event) {
  event.target.style.display = 'none'
}

const instantCheck = document.querySelector('#instant')
instantCheck.onclick = function (event) {
  const startTimeInput = document.querySelector('#start_time_input')
  const setTime = document.querySelector('#setTime')
  const notifyCheckbox = document.querySelector('#notifyCheckbox')
  const datetimeLocalWrap = document.querySelector('#datetimeLocalWrap')
  if (instantCheck.checked) {
    startTimeInput.readonly = true
    notifyCheckbox.disabled = true
    datetimeLocalWrap.style.background = 'rgb(209,209,209)'
    setTime.style.display = 'none'
  } else {
    startTimeInput.readonly = false
    notifyCheckbox.disabled = false
    datetimeLocalWrap.removeAttribute('style')
    setTime.removeAttribute('style')
  }
}

const exchangeForm = document.forms.namedItem('exchangeForm')
exchangeForm.addEventListener('submit', (e) => {
  document.querySelector('.form-popup').style.display = 'none'
  e.preventDefault()
  const formData = new FormData(exchangeForm)
  formData.append('room_id', talkTo.room_id)
  formData.append('publisher_id', user_id)
  formData.append('first_lang', user.native)
  formData.append('second_lang', user.learning)
  const checkBox = document.getElementById('noticing')

  // for server
  if (window.location.hostname === HOST_NAME) {
    const localtime = new Date(formData.get('start_time')).toISOString().split('.')[0]
    formData.set('start_time', localtime)
  }

  if (formData.get('notice') === 'on') {
    formData.set('notice', 1)
  } else {
    formData.set('notice', 2)
  }

  const exchangeInvite = {}
  for (const data of formData.entries()) {
    exchangeInvite[data[0]] = data[1]
  }

  const invitation = {
    receiver: talkTo.user_id,
    data: {
      exchangeInvite,
      sender: {
        user_id: user.user_id,
        name: user.name,
        picture: user.picture
      }
    }
  }
  socket.emit('exchangeInvite', invitation)
})

function initExchangeEnvironment() {
  step = 0 // exchange step
  exchangeData = null
  duration = null
  ratio = null
  time = null
  startTime = null
  window.clearInterval(conterIntervalId)
  conterIntervalId = null
  history_id = null

  document.querySelector('#chat-box-head').removeAttribute('style')
  document.querySelector('#chat-box-head').removeAttribute('part')
  document.querySelector('#currentLang').textContent = ''

  if (voiceRecorder) {
    voiceRecorder.stop()
  }
  if (recognition) {
    recognition.stop()
  }
}

function redirectToRoomInURL() {
  const params = (new URL(document.location)).searchParams
  const room = params.get('room')
  if (room) {
    const roomInt = parseInt(room)
    window.location = `/friend.html?room=${roomInt}`
  }
}
