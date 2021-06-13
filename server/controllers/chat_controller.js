const google = require('../../util/google')
const Chat = require('../models/chat_model')

const translateText = async (req, res) => {
}

const getFriendList = async (req, res) => {
  const user_id = req.user.user_id
  let result = await Chat.getFriendList(user_id)

  const rooms = await Chat.getRooms(user_id)
  let roomPair = {}
  rooms.map(room => roomPair[room.user_id] = room.room_id)

  let roomList = rooms.map(room => room.room_id)
  const unread = await Chat.getUnreadMsgNum(roomList)
  let unreadPair = {}
  unread.map(record => unreadPair[record.sender] = record.unread)

  result = result.map(user => {
    user.room_id = roomPair[user.user_id]
    user.unread = unreadPair[user.user_id]
    return user
  })
  const data = {
    user: req.user,
    data: result
  }
  res.send(data)
};

const getHistory = async (req, res) => {
  const room = req.query.room
  let data = await Chat.getHistory(room)
  data = data.map(msg => {
    switch (msg.type) {
      case 'text': {
        msg.content = msg.content.toString()
        break
      }
    }
    return msg
  })
  res.send(data)
};

const createExchange = async (req, res) => {
  const exchangeData = req.body
  const result = await Chat.createExchange(exchangeData)
}

module.exports = {
  translateText,
  getFriendList,
  getHistory,
  createExchange
};