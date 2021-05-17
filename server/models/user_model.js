const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {
  query,
  transaction,
  commit,
  rollback
} = require('./mysqlcon');
const {
  TOKEN_SECRET
} = process.env

const signUp = async (user) => {
  try {
    const queryStr = 'INSERT INTO user SET ?'
    const result = await query(queryStr, user)
    user.userId = result.insertId
    return user
  } catch (error) {
    return {
      error
    }
  }
}

const isEmailExist = async (email) => {
  const result = await query('SELECT email FROM user WHERE email = ? FOR UPDATE', [email])
  return result.length > 0
}

const nativeSignIn = async (email, password) => {
  try {
    await transaction();

    const users = await query('SELECT * FROM user WHERE email = ?', [email]);
    const user = users[0];
    if (!bcrypt.compareSync(password, user.password)) {
      await commit();
      return {
        error: 'Password is wrong'
      };
    }

    const token = jwt.sign({
      provider: user.provider,
      name: user.name,
      email: user.email,
      picture: user.picture
    }, TOKEN_SECRET);

    const queryStr = 'UPDATE user SET token = ? WHERE user_id = ?';
    await query(queryStr, [token, user.id]);
    await commit();
    user.token = token;
    return {
      user
    };
  } catch (error) {
    await rollback();
    return {
      error
    };
  }
};

const getUserDetail = async (email) => {
  try {
    const users = await query('SELECT * FROM user WHERE email = ?', [email]);
    return users[0];
  } catch (e) {
    return null;
  }
};

module.exports = {
  isEmailExist,
  signUp,
  nativeSignIn,
  getUserDetail,
}
