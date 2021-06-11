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
  let result = await User.getWaitingNoticeExchange()
  if (result.length > 0) {

    let userIdList = []
    result.map(exchange => {
      userIdList.push(exchange.user_a)
      userIdList.push(exchange.user_b)
    })
    userIdList = [...new Set(userIdList)]//remove dupilicate

    const groupDtail = await User.getGroupDetail(userIdList)
    const userData = {}
    groupDtail.map(user => userData[user.user_id] = user)

    result.map(exchange => {
      const user = {}
      user[exchange.user_a] = userData[exchange.user_a]
      user[exchange.user_b] = userData[exchange.user_b]
      const data = {
        exchange,
        user,
      }
      if (exchange.remainTime < 0) {
        Socket.onStartNotice(io, data)
      } else {
        if (exchange.status === 1 && exchange.notice === 1) {
          Socket.beforeStartNotice(io, data)
        } else if (exchange.notice === 2) {
          Socket.onStartNotice(io, data)
        }
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
