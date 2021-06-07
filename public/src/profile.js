let socket
let friendData
let exchange
let favorite
let replyData
let senderData
let user_id // don't move it. notice need this variable

fetch('/user/profile', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer ' + window.localStorage.getItem('JWT') }
}).then(res => res.json())
  .then(res => {
    user_id = res.data.user.user_id // don't move it. notice need this variable
    socket = io({
      auth: {
        user_id: user_id
      }
    })

    socket.on('friend_online', online_notice)
    socket.on('aheadExchangeNotice', aheadExchangeNotice)
    socket.on('waitingInvite', renderWaitingIvite)

    exchange = res.data.exchange

    favorite = res.data.favorite
    replyData = favorite.replyData
    senderData = favorite.senderData
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
  const sender = senderData[msg.sender]
  const reply = replyData[msg.reply]

  const template = document.querySelector('#favoriteTemplate').content
  const clone = document.importNode(template, true)

  clone.querySelector('.headIcon').src = sender.picture
  clone.querySelector('.name').textContent = sender.name
  clone.querySelector('.sendTime').textContent = msg.time.split('T')[0]

  //render reply message
  if (msg.reply !== null) {
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
        const audioBlob = new Blob([arrayBuffer], { type: 'audio/ogg' })
        const audio = clone.querySelector('#replyMsg audio')
        audio.style = 'display : block'
        audio.src = window.URL.createObjectURL(audioBlob)
        break
      }
    }
    clone.querySelector('#replyMsg').style = 'display:flex'
    clone.querySelector('#replyIcon').style = 'display:inline'
  }

  //render correct message
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
      const audioBlob = new Blob([msg.content], { type: 'audio/ogg' })
      const audio = clone.querySelector('#originMsg audio')
      audio.setAttribute('style', 'display: block')
      audio.src = window.URL.createObjectURL(audioBlob)
      break
    }
    case 'picture': {
      break
    }
  }

  const favoriteContainer = document.querySelector('#favoriteContainer')
  favoriteContainer.append(clone)
  favoriteContainer.scrollTop = favoriteContainer.scrollHeight

}




const renderExchange = () => {
  const exchangeData = exchange.exchangeData
  const roommateData = exchange.roommateData
  const template = document.querySelector('#exchangeTemplate').content
  const exchangeContainer = document.querySelector('#exchangeContainer')

  exchangeData.map(item => {
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
    clone.querySelector('.firstLang').textContent = item.first_lang
    clone.querySelector('.secondDuration').textContent = '' + duration * (1 - ratio) + 'mins'
    clone.querySelector('.secondLang').textContent = item.second_lang

    exchangeContainer.append(clone)
  })
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
      socket.on('invite', (user_id) => {
        userData[user_id].sentInvite = 'Waiting'
        element.textContent = 'Waiting'
      })
      break
    }
    case "Accept": {
      userData[element.id].receivedInvite = "Let's Chat"
      socket.emit('accept', [user_id, parseInt(element.id)])
      socket.on('accept', (room) => {
        console.log(room)
        document.querySelector('.reject').remove()
        element.setAttribute('room', room)
        element.textContent = "Let's Chat"
      })
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

