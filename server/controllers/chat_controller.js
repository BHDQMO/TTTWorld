const Chat = require('../models/chat_model')

const getFriendList = async (req, res) => {
  const userId = req.user.user_id
  let friendList = await Chat.getFriendList(userId)

  const rooms = await Chat.getRooms(userId)
  const roomPair = {}
  rooms.forEach((room) => { roomPair[room.user_id] = room.room_id })

  const roomIds = rooms.map((room) => room.room_id)
  const unread = await Chat.getUnreadMsgNum(roomIds)
  const unreadPair = {}
  unread.forEach((record) => { unreadPair[record.sender] = record.unread })

  friendList = friendList.map((user) => {
    user.room_id = roomPair[user.user_id]
    user.unread = unreadPair[user.user_id]
    return user
  })
  const data = {
    user: req.user,
    data: friendList
  }
  res.send(data)
}

const getHistory = async (req, res) => {
  const { room } = req.query
  let data = await Chat.getHistory(room)
  data = data.map((msg) => {
    switch (msg.type) {
      case 'text': {
        msg.content = msg.content.toString()
        break
      }
    }
    return msg
  })
  res.send(data)
}

const createExchange = async (req, res) => {
  const exchangeData = req.body
  const exchangeId = await Chat.createExchange(exchangeData)
  res.send(exchangeId)
}

module.exports = {
  getFriendList,
  getHistory,
  createExchange
}
