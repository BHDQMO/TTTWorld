let socket
let friendData
let exchange
let favorite
let replyData
let senderData
let collectionData
let user_id // don't move it. notice need this variable
let user

fetch('/user/profile', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer ' + window.localStorage.getItem('JWT') }
}).then(res => res.json())
  .then(res => {
    user_id = res.data.user.user_id // don't move it. notice need this variable

    if (!socket) {
      socket = io({
        auth: {
          user_id: user_id
        }
      })
    }

    socket.on('friend_online', online_notice)
    socket.on('waitingInvite', renderWaitingIvite)
    socket.on('inviteAccepted', handleInviteAccepted)

    socket.on('beforeExchangeStart', beforeExchangeStart)
    socket.on('exchangePreStart', exchangePreStart)

    socket.on('exchangeInvite', handleExchangeInvite)
    socket.on('exchangeInviteAccepted', handleExchangeInviteAccepted)
    socket.on('exchangeInviteRejected', handleExchangeInviteRejected)


    exchange = res.data.exchange

    favorite = res.data.favorite
    replyData = favorite.replyData
    senderData = favorite.senderData
    collectionData = favorite.collectionData
    user = res.data.user
    renderProfile(res.data.user)

    if (exchange.exchangeData.length > 0 && Object.keys(exchange.roommateData).length > 0) {
      renderExchange()
    } else {
      document.querySelector('#exchange .emptyInfo').style = 'display:flex'
    }
    if (favorite.favoriteData.length > 0) {
      renderFavorite()
    } else {
      document.querySelector('#favorite .emptyInfo').style = 'display:flex'
    }
  })


const renderProfile = (user) => {
  const picture = document.querySelector('#myDetailBox .picture')
  picture.setAttribute('src', user.picture)
  const name = document.querySelector('#myDetailBox .name')
  name.innerHTML = user.name
  const birthday = document.querySelector('#myDetailBox .birthday')
  birthday.innerHTML = user.birthday.split('T')[0]
  const email = document.querySelector('#myDetailBox .email')
  email.innerHTML = user.email
  const interest = document.querySelector('#myDetailBox .interest')
  interest.innerHTML = user.interest
  const gender = document.querySelector('#myDetailBox .gender')
  gender.innerHTML = user.gender
  const introduction = document.querySelector('#myDetailBox .introduction')
  introduction.innerHTML = user.introduction
  const native = document.querySelector('#myDetailBox .native')
  native.innerHTML = langCodePair[user.native]
  const learning = document.querySelector('#myDetailBox .learning')
  learning.innerHTML = langCodePair[user.learning]
  const address = document.querySelector('#myDetailBox .address')
  address.innerHTML = user.address
}

const renderFavorite = () => {
  const favoriteData = favorite.favoriteData
  favoriteData.map(item => {
    renderMessage(item)
  })

}

async function renderMessage(msg) {
  console.log(msg)
  const sender = senderData[msg.sender]
  const reply = replyData[msg.reply]

  const template = document.querySelector('#favoriteTemplate').content
  let clone = document.importNode(template, true)

  clone.querySelector('.headIcon').src = sender.picture
  clone.querySelector('.name').textContent = sender.name
  clone.querySelector('.sendTime').textContent = msg.time.split('T')[0]

  //render reply message
  if (msg.reply) {
    const replyType = reply.type
    switch (replyType) {
      case 'text': {
        if (msg.correct === 1) {
          let wrongString = reply.content.split('')
          let rightString = msg.content.split('')
          const result = patienceDiff(wrongString, rightString).lines

          let tempString = ''
          let isDetected = false
          const markedWrongSpans = document.createElement('span')
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
          const replyMsg = clone.querySelector('#replyMsg')
          replyMsg.append(markedWrongSpans)
        } else if (msg.correct === 0) {
          let replyContent = clone.querySelector('#replyMsg #content')
          replyContent.textContent = reply.content
        }
        break
      }
      case 'audio': {
        const buffer = favorite.replyData[msg.reply].content.data
        var arrayBuffer = new ArrayBuffer(buffer.length);
        var view = new Uint8Array(arrayBuffer);
        buffer.map((b, i) => view[i] = b)
        const audioBlob = new Blob([arrayBuffer], { type: 'audio/opus' })
        const audio = clone.querySelector('#replyMsg audio')
        audio.style = 'display : block'
        audio.src = window.URL.createObjectURL(audioBlob)
        break
      }
    }
    clone.querySelector('#replyMsg').style = 'display:flex'
    clone.querySelector('#replyIcon').style = 'display:inline'
  }

  //render origin message
  switch (msg.type) {
    case 'text': {
      //render correction
      if (msg.correct === 1) {
        let wrongString = favorite.replyData[msg.reply].content.split('')
        let rightString = msg.content.split('')
        const result = patienceDiff(wrongString, rightString).lines

        let tempString = ''
        let isDetected = false
        let markedRightSpans = document.createElement('span')
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
        })

        const originMsg = clone.querySelector('#originMsg')
        const audio = clone.querySelector('#originMsg audio')
        markedRightSpans = originMsg.insertBefore(markedRightSpans, audio)
      } else {
        const sourceSpan = clone.querySelector('#originMsg #content')
        sourceSpan.removeAttribute('hidden')
        sourceSpan.textContent = msg.content
      }
      break
    }
    case 'audio': {
      const buffer = msg.content.data
      var arrayBuffer = new ArrayBuffer(buffer.length);
      var view = new Uint8Array(arrayBuffer);
      buffer.map((b, i) => view[i] = b)
      msg.content = arrayBuffer
      const audioBlob = new Blob([msg.content], { type: 'audio/opus' })
      const audio = clone.querySelector('#originMsg audio')
      audio.setAttribute('style', 'display: block')
      audio.src = window.URL.createObjectURL(audioBlob)
      break
    }
    case 'exchange': {
      const history_id = msg.id
      const collection = collectionData[history_id]

      const template = document.querySelector('#collectionTemplate').content
      clone = document.importNode(template, true)
      const collectionContainer = clone.querySelector('.favoriteItem')

      // shwo the exchagne info
      const exchange_id = collectionData[history_id][0].exchange_id
      const exchangeData = exchange.exchangeData.find(item => item.id === exchange_id)
      clone.querySelector('.sendTime').textContent = exchangeData.start_time.split('T')[0]
      const exchageClone = fillExchangeData(exchangeData)
      exchageClone.querySelector('.time').remove()
      collectionContainer.append(exchageClone)

      collection.map(item => {
        const collectionItemTemplate = document.querySelector('#collectionItemTemplate').content
        const collectionClone = document.importNode(collectionItemTemplate, true)
        collectionClone.querySelector('.timing').textContent = item.timing
        collectionClone.querySelector('.transcript').textContent = item.transcript
        collectionClone.querySelector('.voiceRecord').src = bufferToUrl(item.audio.data)
        collectionClone.querySelector('.score').textContent = item.confidence
        collectionContainer.append(collectionClone)
      })
      break
    }
    case 'picture': {
      break
    }
  }

  if (msg.translate) {
    const translateMsg = clone.querySelector('#translateMsg')
    translateMsg.querySelector('#content').textContent = msg.translate
    translateMsg.style.display = 'block'
  }

  const favoriteContainer = document.querySelector('#favoriteContainer')
  favoriteContainer.append(clone)
  favoriteContainer.scrollTop = favoriteContainer.scrollHeight

}


const renderExchange = () => {
  const exchangeData = exchange.exchangeData
  const exchangeContainer = document.querySelector('#exchangeContainer')
  exchangeData.map(item => {
    const clone = fillExchangeData(item)
    exchangeContainer.append(clone)
  })
}

function fillExchangeData(item) {
  const roommateData = exchange.roommateData

  const template = document.querySelector('#exchangeTemplate').content
  const clone = document.importNode(template, true)
  const startTime = new Date(item.start_time)
  const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(startTime).toUpperCase().slice(0, 3)
  const date = fillZero(startTime.getDate())
  const startHours = fillZero(startTime.getHours())
  const startMin = fillZero(startTime.getMinutes())

  const endTime = new Date(startTime + item.duration * 60 * 1000)
  const endHours = fillZero(endTime.getHours())
  const endMin = fillZero(endTime.getMinutes())

  const timeString = month + ' ' + date + ', ' + startHours + ':' + startMin + '-' + endHours + ':' + endMin

  clone.querySelector('.time').textContent = timeString
  clone.querySelector('.headIcon').src = roommateData[item.room_id].picture
  clone.querySelector('.name').textContent = roommateData[item.room_id].name
  const duration = item.duration
  const ratio = item.ratio / 100
  clone.querySelector('.firstDuration').textContent = '' + duration * ratio + 'mins'
  clone.querySelector('.firstLang').textContent = langCodePair[item.first_lang]
  clone.querySelector('.secondDuration').textContent = '' + duration * (1 - ratio) + 'mins'
  clone.querySelector('.secondLang').textContent = langCodePair[item.second_lang]
  return clone
}

function logout() {
  window.localStorage.removeItem('JWT')
  window.location = "/signin.html";
}










// *********************************************

let userArr //Array
let userData //pair

fetch('/explore/user_list', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer ' + window.localStorage.getItem('JWT') }
}).then(res => res.json())
  .then(res => {
    user_id = res.user_id
    userArr = res.data
    userData = {}
    userArr.map(item => userData[item.user_id] = item.data)
    renderUserList()

    if (!socket) {
      socket = io({
        auth: {
          user_id: user_id
        }
      })
    }

    socket.on('reject', (user_id) => {
      userData[user_id].sentInvite = null
      const inviteBtn = document.querySelector('.invite')
      if (parseInt(inviteBtn.id) === user_id) {
        inviteBtn.textContent = 'Invite'
      }
    })

    socket.on('invite', (user_id) => {
      userData[user_id].sentInvite = 'Waiting'
      const inviteBtn = document.querySelector('.invite')
      if (parseInt(inviteBtn.id) === user_id) {
        inviteBtn.textContent = 'Waiting'
      }
    })

    socket.on('inviteAccepted', ({ user, room }) => {
      if (userData[user.user_id]) {
        userData[user.user_id].sentInvite = "Let's Chat"
      }

      const inviteBtn = document.querySelector('.invite')
      if (parseInt(inviteBtn.id) === user.user_id) {
        inviteBtn.setAttribute('room', room)
        inviteBtn.textContent = "Let's Chat"
      }

      const count = document.querySelector(".count")
      count.textContent = parseInt(count.textContent) + 1
      document.querySelector('#bufferMsg').style.display = 'none'

      const dropdownContent = document.querySelector('.dropdown-content')
      const tempalte = document.querySelector('#notice_dropdown_template').content
      const clone = document.importNode(tempalte, true)
      clone.querySelector('.starting').textContent = 'Your invitation has been accepted'
      clone.querySelector('.friendInviteBox').setAttribute('userId', user.user_id)
      clone.querySelector('.headIcon').src = user.picture
      clone.querySelector('.name').textContent = user.name

      const acceptInvite = clone.querySelector('.acceptInvite')
      console.log(room)
      acceptInvite.setAttribute('room', `${room}`)
      acceptInvite.textContent = "Let's Chat"

      //wait fix, ther dropdown content box just disapear after click ok
      const rejectInvite = clone.querySelector('.rejectInvite')
      rejectInvite.textContent = 'OK'

      dropdownContent.append(clone)
    })
  })

const renderUserList = function () {
  const personContainer = document.querySelector('#personContainer')
  const template = document.querySelector('#personTemplate').content
  userArr.map(user => {
    const clone = document.importNode(template, true)
    const data = user.data
    clone.querySelector('.person').setAttribute('id', user.user_id)
    clone.querySelector('.headIcon').src = data.picture
    clone.querySelector('.name').textContent = data.name
    clone.querySelector('.native').textContent = langCodePair[data.native]
    clone.querySelector('.learning').textContent = langCodePair[data.learning]
    clone.querySelector('.distance').textContent = Math.round(data.distance) + 'km'
    personContainer.append(clone)
  })
  renderUserDetail()
}

const renderUserDetail = function (element) {
  //remove reject button to prevent duplicate print
  const rejectBtn = document.querySelector('.reject')
  if (rejectBtn) { rejectBtn.remove() }

  const userId = element ? element.id : userArr[0].user_id

  const data = userData[userId]
  const detail = document.querySelector('#userDetailBox')
  detail.querySelector('.picture').setAttribute('src', data.picture)
  detail.querySelector('.name').textContent = data.name
  detail.querySelector('.email').textContent = data.email
  detail.querySelector('.native').textContent = langCodePair[data.native]
  detail.querySelector('.learning').textContent = langCodePair[data.learning]
  detail.querySelector('.interest').textContent = data.interest
  detail.querySelector('.introduction').textContent = data.introduction


  const button = document.querySelector('.invite')
  button.setAttribute('id', userId)
  button.setAttribute('room', data.room)

  if (data.receivedInvite === 'Waiting') {
    button.textContent = 'Accept'
    const template = document.querySelector('template.rejectBtn').content
    const clone = document.importNode(template, true)
    clone.querySelector('button').setAttribute('id', userId)
    button.after(clone)
  } else {
    button.textContent = data.sentInvite || data.receivedInvite || 'Invite'
  }
}

const action = function (element) {
  switch (element.textContent) {
    case 'Invite': {
      socket.emit('invite', [user_id, parseInt(element.id)])
      //send to server to create invite
      //after receive server feedback, update own data
      break
    }
    case "Accept": {
      userData[element.id].receivedInvite = "Let's Chat"
      socket.emit('accept', [user_id, parseInt(element.id)])

      break
    }
    case "Reject": {
      element.remove()
      document.querySelector('.invite').textContent = 'Invite'
      socket.emit('reject', [user_id, parseInt(element.id)])

      break;
    }
    case "Let's Chat": {
      const room = element.getAttribute('room')
      // console.log(`/friend.html?room=${room}`)
      window.location = `/friend.html?room=${room}`
      break;
    }
  }
}

