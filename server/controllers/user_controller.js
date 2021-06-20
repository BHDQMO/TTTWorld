const _ = require('lodash')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const validator = require('validator')

const User = require('../models/user_model')
const Google = require('../../util/google')

const { TOKEN_SECRET, S3_OBJECT_URL } = process.env
const salt = parseInt(process.env.BCRYPT_SALT)

const signUp = async (req, res) => {
  let { name } = req.body
  const { email, password } = req.body

  if (!name || !email || !password) {
    res.status(400).send({
      error: 'Request Error: name, email and password are required.'
    })
    return
  }

  if (!validator.isEmail(email)) {
    res.status(400).send({
      error: 'Request Error: Invalid email format'
    })
    return
  }

  name = validator.escape(name)

  const isEmailEsixt = await User.isEmailExist(email)
  if (isEmailEsixt) {
    res.status(400).send({
      error: 'Email Already Exists'
    })
    return
  }

  try {
    let user = req.body
    let interests = await Google.translateText(user.interest, 'en')
    interests = interests.map((interest) => _.startCase(interest))
    user.password = bcrypt.hashSync(user.password, salt)
    user.picture = `${S3_OBJECT_URL}/${user.picture}`
    user.geocode = `ST_PointFromText('POINT(${await Google.geocoding(user.address)})',3857)`
    user.interest = interests.toString()
    user.token = jwt.sign({
      provider: user.provider,
      name: user.name,
      email: user.email,
      picture: user.picture
    }, TOKEN_SECRET)
    user = await User.signUp(user, interests)
    res.status(200).send({
      data: {
        token: user.token,
        user: {
          user_id: user.user_id,
          provider: user.provider,
          name: user.name,
          email: user.email,
          picture: user.picture
        }
      }
    })
  } catch (error) {
    console.log(error)
    res.send(error)
  }
}

const nativeSignIn = async (email, password) => {
  if (!email || !password) {
    return {
      error: 'Request Error: email and password are required.',
      status: 400
    }
  }

  try {
    return await User.nativeSignIn(email, password)
  } catch (error) {
    console.log(error)
    return {
      error
    }
  }
}

const signIn = async (req, res) => {
  const data = req.body
  let result
  switch (data.provider) {
    case 'native':
      result = await nativeSignIn(data.email, data.password)
      break
    default:
      result = { error: 'Wrong Request' }
  }

  if (result.error) {
    const statusCode = result.status ? result.status : 403
    res.status(statusCode).send({
      error: result.error
    })
    return
  }

  const { user } = result
  if (!user) {
    res.status(500).send({
      error: 'Database Query Error'
    })
    return
  }

  res.status(200).send({
    data: {
      token: user.token,
      user: {
        user_id: user.user_id,
        provider: user.provider,
        name: user.name,
        email: user.email,
        picture: user.picture
      }
    }
  })
}

const getUserProfile = async (req, res) => {
  const userId = req.user.user_id
  try {
    let favoriteData = await User.getFavorite(userId)

    if (favoriteData.error) {
      favoriteData = {
        favoriteData: []
      }
    }

    let exchangeData = await User.getExchange(userId)
    if (exchangeData.error) {
      exchangeData = {
        exchangeData: []
      }
    }
    const data = {
      user: req.user,
      favorite: favoriteData,
      exchange: exchangeData
    }
    res.status(200).send({ data })
  } catch (error) {
    console.log(error)
    res.status(501).send({ error })
  }
}

module.exports = {
  signUp,
  signIn,
  getUserProfile
}
