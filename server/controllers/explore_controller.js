const _ = require('lodash')
const Explore = require('../models/explore_model')
const { calAge } = require('../../util/util')

const getUserList = async (req, res) => {
  const sort = req.query.sort || 'distance'
  const paging = req.query.paging || 0
  const user = req.user.user_id
  let userList = await Explore.getUserList(user, sort, paging)

  const userIds = userList.forEach((x) => x.user_id)
  const friendStatusPair = await Explore.getFriendStatus(user, userIds)

  let partialFriendList = Object.assign(friendStatusPair.sent, friendStatusPair.received)
  partialFriendList = Object.entries(partialFriendList)
  partialFriendList = _.groupBy(partialFriendList, '[1]')
  partialFriendList = partialFriendList["Let's Chat"] ? partialFriendList["Let's Chat"].map((i) => i[0]) : null

  const roomPair = await Explore.getRooms(user, partialFriendList)

  userList = userList.map((x) => {
    const userId = x.user_id
    const data = { user_id: userId }
    x.age = calAge(x.birthday)
    x.sentInvite = friendStatusPair.sent[userId] || null
    x.receivedInvite = friendStatusPair.received[userId] || null
    x.room = roomPair[userId] || null
    delete x.user_id
    delete x.token
    delete x.password
    delete x.address
    delete x.geocode

    data.data = x
    return data
  })
  res.send({ data: userList, user_id: user })
}

module.exports = {
  getUserList
}
