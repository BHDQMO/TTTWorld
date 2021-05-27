let socket

let user_id //current user
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

    socket = io({
      auth: {
        user_id
      }
    })

    socket.on('friend_online', online_notice)
    socket.on('waitingInvite', renderWaitingIvite)

    renderUserList()
  })

const renderUserList = function () {
  const list = document.querySelector('.list')
  const template = document.querySelector('template.tableRow').content
  userArr.map(user => {
    const clone = document.importNode(template, true)
    const data = user.data
    clone.querySelector('#userId').setAttribute('id', user.user_id)
    clone.querySelector('#name').textContent = data.name
    clone.querySelector('#age').textContent = data.age
    clone.querySelector('#native').textContent = data.native
    clone.querySelector('#learning').textContent = data.learning
    clone.querySelector('#distance').textContent = Math.round(data.distance)
    clone.querySelector('#match_rate').textContent = data.match_rate || '100%'
    list.append(clone)
  })
  renderUserDetail()
}

const renderUserDetail = function (element) {

  //remove reject button to prevent duplicate print
  const rejectBtn = document.querySelector('.reject')
  if (rejectBtn) { rejectBtn.remove() }

  const userId = element ? element.id : userArr[0].user_id

  const data = userData[userId]
  const detail = document.querySelector('.detail')
  detail.querySelector('#picture').setAttribute('src', data.picture)
  detail.querySelector('#name').textContent = data.name
  detail.querySelector('#introduction').textContent = data.introduction
  detail.querySelector('#interest').textContent = data.interest

  const button = document.querySelector('.invite')
  button.setAttribute('id', userId)
  console.log(data)
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

