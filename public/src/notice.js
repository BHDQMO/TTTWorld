let waitingAnswerExchangeInvite = {}

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
  }, 10 * 1000)
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

  const currentPage = window.location.pathname
  if (currentPage === '/friend.html') {
    const form_popup = document.querySelector('.form-popup')
    const open_button = document.querySelector('.open-button')
    if (!form_popup.contains(event.target) && event.target !== open_button) {
      form_popup.style.display = "none";
    }
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

const handleInviteAccepted = ({ user, room }) => {
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
  acceptInvite.setAttribute('room', `${room}`)
  acceptInvite.textContent = "Let's Chat"

  //wait fix, ther dropdown content box just disapear after click ok
  const rejectInvite = clone.querySelector('.rejectInvite')
  rejectInvite.textContent = 'OK'

  dropdownContent.append(clone)
}

const noticeAction = function (element) {
  switch (element.textContent) {
    case "Accept": {
      onCheckNotice()
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
    case "Reject": {
      onCheckNotice()
      element.textContent = 'Rejected'
      document.querySelector('.acceptInvite').remove()
      socket.emit('reject', [user_id, parseInt(element.id)])
      const waitRemoveId = element.id
      setTimeout(() => {
        const inviteItem = document.querySelector(`.friendInviteBox[userId='${waitRemoveId}']`)
        inviteItem.remove()
        onRemoveNotice()
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
      if (friendInviteBoxs.length === 1) {
        dropdownContent.style.display = 'flex'
        document.querySelector('#bufferMsg').style.display = 'flex'
      }
      break;
    }
  }
}

function acceptExchangeInvite(element) {
  onCheckNotice()
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
    onRemoveNotice()
  }, 5 * 1000)

  // onRemoveNotice()
}

function rejectExchangeInvite(element) {
  onCheckNotice()
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
    onRemoveNotice()
  }, 5 * 1000)

  // onRemoveNotice()
}

const handleExchangeInvite = (data) => {
  if (data.length > 0) {
    onAddNotice()
  }

  data.map(invite => {
    const exchangeInvite = invite.exchangeInvite
    waitingAnswerExchangeInvite[exchangeInvite.exchange_id] = exchangeInvite
  })

  data.map(invite => {
    const template = document.querySelector('#exchangeNoticeTemplate').content
    const clone = document.importNode(template, true)
    clone.querySelector('.starting').textContent = 'You have a new exchange invite'
    clone.querySelector('.exchangeItem').append(builtExchangeBox(invite))

    const exchange_id = invite.exchangeInvite.exchange_id
    clone.querySelector('.exchangeNoticeItem').setAttribute('exchange_id', `${exchange_id}`)
    clone.querySelector('.acceptExchangeInvite').setAttribute('exchange_id', `${exchange_id}`)
    clone.querySelector('.rejectExchangeInvite').setAttribute('exchange_id', `${exchange_id}`)
    document.querySelector('.dropdown-content').append(clone)
  })
}

const handleExchangeInviteAccepted = (data) => {
  const starting = 'Your exchange invitation has been accepted'
  createExchangeInviteAnswerNotice(data, starting)
}

const handleExchangeInviteRejected = (data) => {
  const starting = 'Your exchange invitation has been rejected'
  createExchangeInviteAnswerNotice(data, starting)
}

const beforeExchangeStart = (data) => {
  const starting = `Exchange with ${data.sender.name} will begin in 10 mins`
  createExchangeInviteAnswerNotice(data, starting)
}

const exchangePreStart = (data) => {
  const starting = `It's time for exchange with ${data.sender.name}!`

  onAddNotice()
  const template = document.querySelector('#exchangeNoticeTemplate').content
  const clone = document.importNode(template, true)
  clone.querySelector('.starting').textContent = starting// here is different
  clone.querySelector('.exchangeItem').append(builtExchangeBox(data))
  const exchange_id = data.exchangeInvite.id
  const checkBtn = document.createElement('button')
  checkBtn.setAttribute('exchange_id', `${exchange_id}`)
  checkBtn.textContent = "Let's Chat"// here is different
  checkBtn.addEventListener('click', (event) => {
    const exchange_id = parseInt(event.target.getAttribute('exchange_id'))
    window.localStorage.setItem(`exchange_${exchange_id}`, JSON.stringify(data.exchangeInvite))
    window.location = `/friend.html?room=${data.exchangeInvite.room_id}&exchange_id=${exchange_id}`
  })
  clone.querySelector('.acceptExchangeInvite').remove()
  clone.querySelector('.rejectExchangeInvite').remove()
  clone.querySelector('.btnBox').append(checkBtn)
  document.querySelector('.dropdown-content').append(clone)
}

const createExchangeInviteAnswerNotice = (data, starting) => {
  onAddNotice()

  const template = document.querySelector('#exchangeNoticeTemplate').content
  const clone = document.importNode(template, true)
  clone.querySelector('.starting').textContent = starting
  clone.querySelector('.exchangeItem').append(builtExchangeBox(data))

  const exchange_id = data.exchangeInvite.exchange_id
  const checkBtn = document.createElement('button')
  checkBtn.setAttribute('exchange_id', `${exchange_id}`)
  checkBtn.textContent = 'OK'
  checkBtn.addEventListener('click', (event) => {
    onCheckNotice()
    event.target.parentNode.parentNode.remove()
    onRemoveNotice()
    // socket.emit('readExchangeInviteAnswer', exchange_id)
  })
  clone.querySelector('.acceptExchangeInvite').remove()
  clone.querySelector('.rejectExchangeInvite').remove()
  clone.querySelector('.btnBox').append(checkBtn)
  document.querySelector('.dropdown-content').append(clone)
}

