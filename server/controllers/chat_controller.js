const google = require('../../util/google')
const Chat = require('../models/chat_model')

const translateText = async (req, res) => {
}

const getFriendList = async (req, res) => {
  const user_id = req.user.user_id
  const result = await Chat.getFriendList(user_id)
  const data = {
    userId: user_id,
    data: result
  }
  res.send(data)
};

const getHistory = async (req, res) => {
  const room = req.query.room
  const data = await Chat.getHistory(room)
  res.send(data)
};

module.exports = {
  translateText,
  getFriendList,
  getHistory
};