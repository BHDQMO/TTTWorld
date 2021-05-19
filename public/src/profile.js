const renderProfile = (res) => {
  data = res.data
  const picture = document.getElementById('picture')
  picture.setAttribute('src', data.picture)
  const name = document.getElementById('name')
  name.innerHTML = 'name : ' + data.name
  const birthday = document.getElementById('birthday')
  birthday.innerHTML = 'birthday : ' + data.birthday
  const email = document.getElementById('email')
  email.innerHTML = 'email : ' + data.email
  const gender = document.getElementById('gender')
  gender.innerHTML = 'gender : ' + data.gender
  const introduction = document.getElementById('introduction')
  introduction.innerHTML = 'introduction : ' + data.introduction
  const native = document.getElementById('native')
  native.innerHTML = 'native : ' + data.native
  const learning = document.getElementById('learning')
  learning.innerHTML = 'learning : ' + data.learning
  const location = document.getElementById('location')
  location.innerHTML = 'location : ' + data.location
}

function logout() {
  window.localStorage.removeItem('JWT')
  window.location = "/thank.html";
}

fetch('/user/profile', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer ' + window.localStorage.getItem('JWT') }
}).then(res => res.json())
  .then(renderProfile)

