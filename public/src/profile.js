let socket
let friendData

const renderProfile = (res) => {
  data = res.data
  const picture = document.getElementById('picture')
  picture.setAttribute('src', data.picture)
  const name = document.getElementById('name')
  name.innerHTML = 'Name : ' + data.name
  const birthday = document.getElementById('birthday')
  birthday.innerHTML = 'Birthday : ' + data.birthday
  const email = document.getElementById('email')
  email.innerHTML = 'Email : ' + data.email
  const gender = document.getElementById('gender')
  gender.innerHTML = 'Gender : ' + data.gender
  const introduction = document.getElementById('introduction')
  introduction.innerHTML = 'Introduction : ' + data.introduction
  const native = document.getElementById('native')
  native.innerHTML = 'Native : ' + data.native
  const learning = document.getElementById('learning')
  learning.innerHTML = 'Learning : ' + data.learning
  const address = document.getElementById('address')
  address.innerHTML = 'Address : ' + data.address
}

function logout() {
  window.localStorage.removeItem('JWT')
  window.location = "/signin.html";
}

fetch('/user/profile', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer ' + window.localStorage.getItem('JWT') }
}).then(res => res.json())
  .then(res => {
    user_id = res.data.user_id
    socket = io({
      auth: {
        user_id
      }
    })

    socket.on('friend_data', ({ friendList }) => {
      friendData = {}
      friendList.map(item => friendData[item.user_id] = item)
      socket.on('friend_online', ({ friend_id }) => {
        online_notice(friend_id)
      })
    })
    renderProfile(res)
  })





