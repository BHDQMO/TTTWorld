const Explore = require('../models/explore_model')
const { calAge } = require('../../util/util')

const getUserList = async (req, res) => {
  const sort = req.query.sort || 'distance'
  const paging = req.query.paging || 0
  const user = req.user.user_id
  let userList = await Explore.getUserList(user, sort, paging)

  userIds = userList.map(user => user.user_id)
  let friendStatusPair = await Explore.getFriendStatus(user, userIds)

  userList = userList.map((user) => {
    userId = user.user_id
    const data = { user_id: userId }
    user.age = calAge(user.birthday)
    user.sentInvite = friendStatusPair.sent[userId] || null
    user.receivedInvite = friendStatusPair.received[userId] || null
    delete user.user_id
    delete user.token
    delete user.password
    delete user.address
    delete user.geocode

    data.data = user
    return data
  })
  res.send({ data: userList, user_id: user })
}

module.exports = {
  getUserList
}
