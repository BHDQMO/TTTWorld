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

const signUp = async (user, interests) => {
  await transaction()
  try {
    const geocode = user.geocode
    delete user.geocode

    const userQueryStr = 'INSERT INTO user SET ?'
    const userResult = await query(userQueryStr, user)
    await query(`UPDATE user SET geocode = ${geocode} WHERE email = '${user.email}'`)
    interests.map(async (interest) => {
      const binding = [interest, interest]
      const interestQueryStr = `INSERT INTO interest (name) SELECT * FROM (SELECT ?) AS temp WHERE NOT EXISTS ( SELECT name FROM interest WHERE name = ?)`
      await query(interestQueryStr, binding)
    })
    await commit()
    user.userId = userResult.insertId
    return user
  } catch (error) {
    await rollback()
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

const getFavorite = async (user_id) => {
  await transaction()
  try {
    let queryString = `
    SELECT * FROM
    (SELECT id AS favorite_id, history_id FROM favorite WHERE user_id = ?) AS favorite_list
    LEFT JOIN history
    ON favorite_list.history_id = history.id
    `
    let favoriteData = await query(queryString, [user_id])
    favoriteData = favoriteData.map(item => {
      if (item.type === 'text') {
        item.content = item.content.toString()
      }
      return item
    })
    let sender = []
    let reply = []
    favoriteData.map(item => {
      if (sender.includes(item.sender) === false) {
        sender.push(item.sender)
      }
      if (item.reply) {
        reply.push(item.reply)
      }
    })
    queryString = `
    SELECT user_id,name,picture FROM user WHERE user_id IN (?)
    `
    const senderResult = await query(queryString, [sender])
    const senderData = {}
    senderResult.map(result => senderData[result.user_id] = result)
    queryString = `
    SELECT * FROM history WHERE id IN (?)
    `
    let replyResult = await query(queryString, [reply])
    replyResult = replyResult.map(item => {
      if (item.type === 'text') {
        item.content = item.content.toString()
      }
      return item
    })
    const replyData = {}
    replyResult.map(result => replyData[result.id] = result)
    await commit()

    const data = {
      favoriteData,
      senderData,
      replyData
    }

    return data
  } catch (error) {
    await rollback()
    return error
  }
};

const getExchange = async (user_id) => {
  let queryString = `
  SELECT * FROM \`exchange\` AS exchangetable
  LEFT JOIN
  (
    SELECT id AS room_id FROM room WHERE user_a = ?
    UNION
    SELECT id AS room_id FROM room WHERE user_b = ?
    ) AS roomlist
    ON roomlist.room_id = exchangetable.room_id
  `
  const exchangeData = await query(queryString, [user_id, user_id])
  const roomList = []
  exchangeData.map(item => {
    if (roomList.includes(item.room_id) === false) {
      roomList.push(item.room_id)
    }
  }
  )
  queryString = `
  SELECT user.user_id, name, picture, room_id FROM 
  (SELECT user_a AS user_id, id AS room_id FROM room WHERE id IN ?
  UNION
  SELECT user_b AS user_id, id AS room_id FROM room WHERE id IN ?
  ) AS roommatelist
  LEFT JOIN user
  ON roommatelist.user_id = user.user_id
  WHERE user.user_id <> ?
  `

  const roommateResult = await query(queryString, [[roomList], [roomList], user_id])
  const roommateData = {}
  roommateResult.map(item => { roommateData[item.room_id] = item })
  const data = {
    exchangeData,
    roommateData
  }
  return data
};

module.exports = {
  isEmailExist,
  signUp,
  nativeSignIn,
  getUserDetail,
  getFavorite,
  getExchange
}
