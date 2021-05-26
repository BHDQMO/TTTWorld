function online_notice(friend_id) {
  let friend_data
  try {
    friend_data = friendData[friend_id]
  } catch (e) {
    console.log(e)
    friend_data = userData[friend_id]
  }

  // friend_data = friendData[friend_id]

  const online_notice = document.querySelector('#online-notice')
  online_notice.style = 'display:flex'

  const template = document.querySelector('#online-notice-template').content
  const clone = document.importNode(template, true)
  clone.querySelector('#online-notice-item').setAttribute('name', `${friend_id}`)
  clone.querySelector('#picture').src = friend_data.picture
  clone.querySelector('#name').textContent = friend_data.name
  online_notice.append(clone)

  window.setTimeout(() => {
    document.querySelector(`div[name='${friend_id}'`).remove()
    if (!online_notice.hasChildNodes()) {
      online_notice.style = 'display:none'
    }
  }, 3000)
}
