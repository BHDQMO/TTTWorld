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
  console.log(result)
  result = result.map(user => {
    user.room_id = roomPair[user.user_id]
    return user
  })
  const data = {
    userId: user_id,
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
      case 'audio': {
        break
      }
      case 'picture': {
        break
      }
    }
    return msg
  })
  res.send(data)
};

module.exports = {
  translateText,
  getFriendList,
  getHistory
};