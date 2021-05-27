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
    document.querySelector('#bufferMsg').remove()

    document.querySelector(".count").textContent = data.unreadNum
    document.querySelector(".dropdown").addEventListener("mouseenter", () => {
      document.querySelector(".count").textContent = 0
      console.log(isNoticeRead)
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
