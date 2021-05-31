let socket
let friendData
let exchange
let favorite

fetch('/user/profile', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer ' + window.localStorage.getItem('JWT') }
}).then(res => res.json())
  .then(res => {
    console.log(res)
    socket = io({
      auth: {
        user_id: res.data.user.user_id
      }
    })

    socket.on('friend_online', online_notice)
    socket.on('waitingInvite', renderWaitingIvite)

    exchange = res.data.exchange
    favorite = res.data.favorite
    renderProfile(res.data.user)
    renderExchange()
    renderFavorite()
  })

const renderProfile = (user) => {
  const picture = document.getElementById('picture')
  picture.setAttribute('src', user.picture)
  const name = document.getElementById('name')
  name.innerHTML = 'Name : ' + user.name
  const birthday = document.getElementById('birthday')
  birthday.innerHTML = 'Birthday : ' + user.birthday
  const email = document.getElementById('email')
  email.innerHTML = 'Email : ' + user.email
  const gender = document.getElementById('gender')
  gender.innerHTML = 'Gender : ' + user.gender
  const introduction = document.getElementById('introduction')
  introduction.innerHTML = 'Introduction : ' + user.introduction
  const native = document.getElementById('native')
  native.innerHTML = 'Native : ' + user.native
  const learning = document.getElementById('learning')
  learning.innerHTML = 'Learning : ' + user.learning
  const address = document.getElementById('address')
  address.innerHTML = 'Address : ' + user.address
}

const renderFavorite = () => {
  const favoriteData = favorite.favoriteData
  favoriteData.map(item => renderMessage(item))

}

const renderExchange = () => {
  console.log(exchange)
  exchange.exchangeData.map(item => {
    const template = document.querySelector('#exchange_template').content
    const clone = document.importNode(template, true)
    clone.querySelector('#host').textContent = item.publisher_id
    clone.querySelector('#with').textContent = exchange.roommateData[item.room_id].name
    clone.querySelector('#time').textContent = item.start_time
    clone.querySelector('#duration').textContent = item.duration
    clone.querySelector('#first_lang').textContent = item.first_lang
    clone.querySelector('#second_lang').textContent = item.second_lang
    clone.querySelector('#ratio').textContent = item.ratio
    const exchangeTable = document.querySelector('#exchange table')
    exchangeTable.append(clone)

  })
}



function logout() {
  window.localStorage.removeItem('JWT')
  window.location = "/signin.html";
}

async function renderMessage(msg) {
  const sender = msg.sender
  const template = document.querySelector('#messageTemplate')
  const clone = document.importNode(template, true).content
  const headIcon = clone.querySelector('#headIcon')
  headIcon.setAttribute('src', favorite.senderData[sender].picture)
  const name = clone.querySelector('#name')
  name.textContent = favorite.senderData[sender].name

  if (msg.reply !== null) {
    const replyType = favorite.replyData[msg.reply].type
    switch (replyType) {
      case 'text': {
        let replyContent = clone.querySelector('#replyMsg #content')
        replyContent = favorite.replyData[msg.reply].content
        if (msg.correct === 1) {
          let wrongString = favorite.replyData[msg.reply].content.split('')
          let rightString = msg.content.split('')
          const result = patienceDiff(wrongString, rightString).lines

          let tempString = ''
          let isDetected = false
          const markedWrongSpans = document.createElement('div')
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
            }
          })
          const replyMsg = clone.querySelector('#replyMsg')
          replyMsg.append(markedWrongSpans)
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
    const replyMsg = clone.querySelector('#replyMsg')
    replyMsg.style = 'display:flex'
  }

  const timeSpan = clone.querySelector('#sendTime')
  timeSpan.textContent = showTime(msg.time)

  switch (msg.type) {
    case 'text': {
      //render correction
      if (msg.correct === 1) {
        let wrongString = favorite.replyData[msg.reply].content.split('')
        let rightString = msg.content.split('')
        const result = patienceDiff(wrongString, rightString).lines

        let tempString = ''
        let isDetected = false
        let markedRightSpans = document.createElement('div')
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

  const favoriteEle = document.querySelector('#favorite')
  favoriteEle.append(clone)
  favoriteEle.scrollTop = favoriteEle.scrollHeight

}




