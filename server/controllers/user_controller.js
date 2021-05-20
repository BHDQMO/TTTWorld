const validator = require('validator')
const User = require('../models/user_model')
const Google = require('../../util/google')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const { TOKEN_SECRET, S3_OBJECT_URL } = process.env
const salt = parseInt(process.env.BCRYPT_SALT);

const signUp = async (req, res) => {
  let { name } = req.body
  name = validator.escape(name)
  const { email, password } = req.body

  // if (!name || !email || !password) {
  //   res.status(400).send({
  //     error: 'Request Error: name, email and password are required.'
  //   })
  //   return
  // }

  // if (!validator.isEmail(email)) {
  //   res.status(400).send({
  //     error: 'Request Error: Invalid email format'
  //   })
  //   return
  // }

  // const isEmailEsixt = await User.isEmailExist(email)
  // if (isEmailEsixt) {
  //   res.status(400).send({
  //     error: 'Email Already Exists'
  //   })
  //   return
  // }

  let user = req.body
  let interests = await Google.translateText(user.interest, 'en')
  user.password = bcrypt.hashSync(user.password, salt)
  user.picture = S3_OBJECT_URL + '/' + user.picture
  user.geocode = `ST_PointFromText('POINT(${await Google.geocoding(user.address)})',3857)`
  user.interest = interests.toString()
  user.token = jwt.sign({
    provider: user.provider,
    name: user.name,
    email: user.email,
    picture: user.picture
  }, TOKEN_SECRET)

  user = await User.signUp(user, interests)
  console.log(user)
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

const nativeSignIn = async (email, password) => {
  if (!email || !password) {
    return {
      error: 'Request Error: email and password are required.',
      status: 400
    };
  }

  try {
    return await User.nativeSignIn(email, password);
  } catch (error) {
    return {
      error
    };
  }
};

const signIn = async (req, res) => {
  const data = req.body;
  let result;
  switch (data.provider) {
    case 'native':
      result = await nativeSignIn(data.email, data.password);
      break;
    case 'facebook':
      result = await facebookSignIn(data.access_token);
      break;
    default:
      result = {
        error: 'Wrong Request'
      };
  }

  if (result.error) {
    const status_code = result.status ? result.status : 403;
    res.status(status_code).send({
      error: result.error
    });
    return;
  }

  const user = result.user;
  if (!user) {
    res.status(500).send({
      error: 'Database Query Error'
    });
    return;
  }

  res.status(200).send({
    data: {
      token: user.token,
      user: {
        id: user.id,
        provider: user.provider,
        name: user.name,
        email: user.email,
        picture: user.picture
      }
    }
  });
};

const getUserProfile = async (req, res) => {
  res.status(200).send({
    data: req.user
  });
  return;
};

module.exports = {
  signUp,
  signIn,
  getUserProfile
}

