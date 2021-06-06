const online_notice = (user) => {
  const online_notice = document.querySelector('#online-notice')
  online_notice.style = 'display:flex'

  const template = document.querySelector('#online-notice-template').content
  const clone = document.importNode(template, true)
  clone.querySelector('#online-notice-item').setAttribute('name', `${user.user_id}`)
  clone.querySelector('#picture').src = user.picture
  clone.querySelector('#name').textContent = user.name
  online_notice.append(clone)

  window.setTimeout(() => {
    document.querySelector(`div[name='${user.user_id}'`).remove()
    if (!online_notice.hasChildNodes()) {
      online_notice.style = 'display:none'
    }
  }, 3000)
}

let isNoticeRead = 0
const renderWaitingIvite = (data) => {
  if (data.unreadNum !== 0) {
    console.log('render waiting invite')
    document.querySelector('#bufferMsg').remove()

    document.querySelector(".count").textContent = data.unreadNum
    document.querySelector(".dropdown").addEventListener("mouseenter", () => {
      document.querySelector(".count").textContent = 0
      if (isNoticeRead === 0) {
        socket.emit("readInvite", user_id)
        isNoticeRead++
      }
    })

    data.waitingInvite.map(invite => {
      const tempalte = document.querySelector('#notice_dropdown_template').content
      const clone = document.importNode(tempalte, true)
      clone.querySelector('img').src = invite.picture
      const someoneName = clone.querySelector('#someoneName')
      someoneName.innerHTML = invite.name
      const lang = clone.querySelector('#lang')
      lang.innerHTML = invite.native + '<->' + invite.learning
      clone.querySelector('.invite').id = invite.user_id
      clone.querySelector('.reject').id = invite.user_id
      const dropdown = document.querySelector('.dropdown-content')
      dropdown.append(clone)
    })
  }
}

const builtExchangeBox = (invite) => {
  const exchangeData = invite.exchangeInvite
  const sender = invite.sender
  const template = document.querySelector('#exchangeItemTemplate').content
  const clone = document.importNode(template, true);
  const startTime = new Date(exchangeData.start_time)
  const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(startTime).toUpperCase().slice(0, 3)
  const date = fillZero(startTime.getDate())
  const startHours = fillZero(startTime.getHours())
  const startMin = fillZero(startTime.getMinutes())

  const endTime = new Date(startTime + exchangeData.duration * 60 * 1000)
  const endHours = fillZero(endTime.getHours())
  const endMin = fillZero(endTime.getMinutes())

  const timeString = month + ' ' + date + ', ' + startHours + ':' + startMin + '-' + endHours + ':' + endMin

  clone.querySelector('.time').textContent = timeString
  clone.querySelector('.headIcon').src = sender.picture
  clone.querySelector('.name').textContent = sender.name
  const duration = exchangeData.duration
  const ratio = exchangeData.ratio / 100
  clone.querySelector('.firstDuration').textContent = '' + duration * ratio + 'mins'
  clone.querySelector('.firstLang').textContent = exchangeData.first_lang
  clone.querySelector('.secondDuration').textContent = '' + duration * (1 - ratio) + 'mins'
  clone.querySelector('.secondLang').textContent = exchangeData.second_lang
  return clone
}

const noticeAction = function (element) {
  switch (element.textContent) {
    case 'Invite': {
      socket.emit('invite', [user_id, parseInt(element.id)])
      socket.on('invite', (user_id) => {
        element.textContent = 'Waiting'
      })
      break
    }
    case "Accept": {
      socket.emit('accept', [user_id, parseInt(element.id)])
      socket.on('accept', (room) => {
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
      window.location = `/friend.html?room=${room}`
      break;
    }
  }
}

const aheadExchangeNotice = (exchange) => {
  console.log(exchange)
  const userList = exchange.userList
  const talkTo = userList.filter(user => user !== user_id)
  alert(`your exchange with ${talkTo} will begin in ${exchange.ahead} minutes`)
}

function acceptExchangeInvite(element) {
  const exchange_id = parseInt(element.getAttribute('exchange_id'))
  answer = {
    sender: {
      user_id: user.user_id,
      picture: user.picture,
      name: user.name
    },
    exchange_id,
    exchangeInvite: waitingAnswerExchangeInvite[exchange_id]
  }
  socket.emit('acceptExchangeInvite', answer)
  document.querySelector(`.rejectExchangeInvite[exchange_id='${exchange_id}']`).remove()
  element.textContent = 'Accepted'
  setTimeout(() => {
    document.querySelector(`.exchangeNoticeItem[exchange_id='${exchange_id}']`).remove()
  }, 5 * 1000)
}

function rejectExchangeInvite(element) {
  const exchange_id = parseInt(element.getAttribute('exchange_id'))
  answer = {
    sender: {
      user_id: user.user_id,
      picture: user.picture,
      name: user.name
    },
    exchange_id,
    exchangeInvite: waitingAnswerExchangeInvite[exchange_id]
  }
  socket.emit('rejectExchangeInvite', answer)
  document.querySelector(`.acceptExchangeInvite[exchange_id='${exchange_id}']`).remove()
  element.textContent = 'Rejected'
  setTimeout(() => {
    document.querySelector(`.exchangeNoticeItem[exchange_id='${exchange_id}']`).remove()
  }, 5 * 1000)
}