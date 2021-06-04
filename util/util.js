require('dotenv').config()
const jwt = require('jsonwebtoken')
const multer = require('multer')
const crypto = require('crypto')
const aws = require('aws-sdk')
const multerS3 = require('multer-s3')

const User = require('../server/models/user_model');
const Socket = require("./socket")

const TOKEN_SECRET = process.env.TOKEN_SECRET

const s3 = new aws.S3({
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY
})

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET,
    acl: 'public-read',
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname })
    },
    key: function (req, file, cb) {
      const customFileName = crypto.randomBytes(18).toString('hex').substr(0, 8)
      const fileExtension = file.mimetype.split('/')[1] // get file extension from original file name
      req.body.picture = customFileName + '.' + fileExtension
      cb(null, customFileName + '.' + fileExtension)
    }
  })
})

const wrapAsync = (fn) => {
  return function (req, res, next) {
    fn(req, res, next).catch(next)
  }
}

const authentication = () => {
  return async function (req, res, next) {
    let accessToken = req.get('Authorization')
    if (!accessToken) {
      res.status(401).send({
        error: 'Unauthorized'
      })
      return
    }
    accessToken = accessToken.replace('Bearer ', '')
    if (accessToken == 'null') {
      res.status(401).send({
        error: 'Unauthorized'
      })
      return
    }

    try {
      const user = jwt.verify(accessToken, TOKEN_SECRET)
      let userDetail = await User.getUserDetail(user.email)
      if (!userDetail) {
        res.status(403).send({
          error: 'Forbidden'
        })
      } else {
        req.user = userDetail
        next()
      }
      return
    } catch (err) {
      res.status(403).send({
        error: 'Forbidden'
      })
    }
  }
}

const calAge = (date) => {
  const birthYear = new Date(date)
  const thisYear = new Date()
  const age = new Date(thisYear - birthYear).getFullYear() - 1970
  return age
}

const serverNotice = async (io) => {
  //get the 1min ahead the ahead notice list
  let waitingNoticeExchange = await User.getWaitingNoticeExchange()
  if (waitingNoticeExchange.length > 0) {
    // const exchangeList = {}
    // waitingNoticeExchange.map(exchange => exchangeList[exchange.room_id] = exchange)

    let roomList = waitingNoticeExchange.map(exchange => exchange.room_id)
    roomList = [...new Set(roomList)]
    let userListByRoom = await User.getUserListByRoom(roomList)

    const roomUserList = {}
    userListByRoom.map(room => roomUserList[room.id] = [room.user_a, room.user_b])

    waitingNoticeExchange = waitingNoticeExchange.map(exchange => {
      exchange.user = roomUserList[exchange.room_id]
      return exchange
    })
    console.log(waitingNoticeExchange)
    waitingNoticeExchange.map(exchange => {
      console.log(exchange)
      const timeDiff = new Date(exchange.start_time) - Date.now()
      console.log(timeDiff)
      const ahead = exchange.ahead_time * 60 * 1000
      console.log(ahead)
      if (timeDiff > 0) {
        console.log('set aheadExchangeNotice timer')
        setTimeout(() => Socket.aheadExchangeNotice({ io, exchange }), timeDiff)
      }
      if (timeDiff + ahead > 0) {
        console.log('set exchangeStartNotice timer')
        setTimeout(() => Socket.exchangeStartNotice({ io, exchange }), timeDiff + ahead)
      }

    })
  } else {
    console.log('there is no exchange need to be notice')
  }
}

module.exports = {
  upload,
  wrapAsync,
  authentication,
  calAge,
  serverNotice
}
