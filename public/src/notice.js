const online_notice = (user) => {
  const online_notice = document.querySelector('#online-notice')
  online_notice.style = 'display:flex'

  const template = document.querySelector('#online-notice-template').content
  const clone = document.importNode(template, true)
  clone.querySelector('#online-notice-item').setAttribute('name', `${user.user_id}`)
  clone.querySelector('#picture').src = user.picture
  clone.querySelector('#name').textContent = user.name
  online_notice.append(clone)

  // window.setTimeout(() => {
  //   document.querySelector(`div[name='${user.user_id}'`).remove()
  //   if (!online_notice.hasChildNodes()) {
  //     online_notice.style = 'display:none'
  //   }
  // }, 10 * 1000)
}

function showNotice() {
  const dropdownContent = document.querySelector('.dropdown-content')
  dropdownContent.style = 'display:flex'
}

window.onclick = function (event) {
  const dropdownContent = document.querySelector('.dropdown-content')
  const noticeTag = document.querySelector('#noticeTag')
  const count = document.querySelector('.count')
  const accept = document.querySelector('.acceptInvite')
  const reject = document.querySelector('.rejectInvite')
  if (!dropdownContent.contains(event.target) && event.target !== noticeTag && event.target !== count && event.target !== accept && event.target !== reject) {
    dropdownContent.style.display = "none";
  }
}

const renderWaitingIvite = (data) => {
  const waitingNum = data.waitingInvite.length
  document.querySelector(".count").textContent = waitingNum
  if (waitingNum > 0) {
    const bufferMsg = document.querySelector('#bufferMsg')
    if (bufferMsg) {
      bufferMsg.style.display = 'none'
    }

    const dropdownContent = document.querySelector('.dropdown-content')
    data.waitingInvite.map(invite => {
      const tempalte = document.querySelector('#notice_dropdown_template').content
      const clone = document.importNode(tempalte, true)
      clone.querySelector('.friendInviteBox').setAttribute('userId', invite.user_id)
      clone.querySelector('.headIcon').src = invite.picture
      clone.querySelector('.name').textContent = invite.name
      clone.querySelector('.acceptInvite').id = invite.user_id
      clone.querySelector('.rejectInvite').id = invite.user_id
      dropdownContent.append(clone)
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
    case "Accept": {
      const count = document.querySelector(".count")
      count.textContent = parseInt(count.textContent) > 0 ? parseInt(count.textContent) - 1 : 0
      socket.emit('accept', { user, sender_Id: parseInt(element.id) })
      //accept the invitation
      //receive the room number from server
      socket.on('accept', (room) => {
        document.querySelector('.rejectInvite').remove()
        element.setAttribute('room', room)
        element.textContent = "Let's Chat"
      })
      break
    }
      querySelectorAll
    case "Reject": {
      const count = document.querySelector(".count")
      count.textContent = parseInt(count.textContent) > 0 ? parseInt(count.textContent) - 1 : 0
      element.textContent = 'Rejected'
      document.querySelector('.acceptInvite').remove()
      socket.emit('reject', [user_id, parseInt(element.id)])
      const waitRemoveId = element.id
      setTimeout(() => {
        const inviteItem = document.querySelector(`.friendInviteBox[userId='${waitRemoveId}']`)
        inviteItem.remove()
        checkDropbox()
      }, 5 * 1000)
      break;
    }
    case "Let's Chat": {
      const count = document.querySelector(".count")
      count.textContent = parseInt(count.textContent) > 0 ? parseInt(count.textContent) - 1 : 0
      const room = element.getAttribute('room')
      window.location = `/friend.html?room=${room}`
      break;
    }
    case "OK": {
      const count = document.querySelector(".count")
      count.textContent = parseInt(count.textContent) > 0 ? parseInt(count.textContent) - 1 : 0

      const friendInviteBoxs = document.querySelectorAll('.friendInviteBox')
      friendInviteBoxs.forEach(box => {
        if (box.contains(element)) {
          box.remove()
        }
      })
      const dropdownContent = document.querySelector('.dropdown-content')
      console.log(friendInviteBoxs)
      if (friendInviteBoxs.length === 1) {
        dropdownContent.style.display = 'flex'
        document.querySelector('#bufferMsg').style.display = 'flex'
      }
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
    checkDropbox()
  }, 5 * 1000)
  const count = document.querySelector(".count")
  count.textContent = parseInt(count.textContent) > 0 ? parseInt(count.textContent) - 1 : 0
  checkDropbox()
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
    checkDropbox()
  }, 5 * 1000)
  const count = document.querySelector(".count")
  count.textContent = parseInt(count.textContent) > 0 ? parseInt(count.textContent) - 1 : 0
  checkDropbox()
}