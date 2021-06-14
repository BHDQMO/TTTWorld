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
    if (interests.length > 0) {
      interests.map(async (interest) => {
        const binding = [interest, interest]
        const interestQueryStr = `INSERT INTO interest (name) SELECT * FROM (SELECT ?) AS temp WHERE NOT EXISTS ( SELECT name FROM interest WHERE name = ?)`
        await query(interestQueryStr, binding)
      })
    }

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
    if (users.length === 0) {
      return {
        error: 'This Email has not been registered'
      };
    }

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
    return e;
  }
};

const getGroupDetail = async (group) => {
  try {
    const result = await query('SELECT user_id,name,picture FROM user WHERE user_id IN (?)', [group]);
    return result;
  } catch (e) {
    return e;
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

    const collectedExchangeHistoryIds = []
    const sender = []
    const reply = []
    favoriteData = favoriteData.map(item => {
      if (item.type === 'text') { //transfer blob to text
        item.content = item.content.toString()
      }
      if (sender.includes(item.sender) === false) {
        sender.push(item.sender)
      }
      if (item.reply) {
        reply.push(item.reply)
      }
      if (item.type === 'exchange') {
        collectedExchangeHistoryIds.push(item.id)
      }
      return item
    })

    const senderData = {}
    if (sender.length > 0) {
      queryString = `SELECT user_id,name,picture FROM user WHERE user_id IN (?)`
      const senderResult = await query(queryString, [sender])
      senderResult.map(result => senderData[result.user_id] = result)
    }

    const replyData = {}
    if (reply.length > 0) {
      queryString = `SELECT * FROM history WHERE id IN (?)`
      let replyResult = await query(queryString, [reply])
      replyResult = replyResult.map(item => {
        if (item.type === 'text') {
          item.content = item.content.toString()
        }
        return item
      })
      replyResult.map(result => replyData[result.id] = result)
    }

    const collectionData = {}
    if (collectedExchangeHistoryIds.length > 0) {
      queryString = `
      SELECT * FROM
      (SELECT id AS exchange_id, history_id FROM \`exchange\` WHERE history_id IN ?) AS temp1 
      LEFT JOIN exchange_collect 
      ON temp1.exchange_id = exchange_collect.exchange_id
      `
      let collectionResult = await query(queryString, [[collectedExchangeHistoryIds]])
      collectionResult.map(item => {
        if (collectionData[item.history_id]) {
          collectionData[item.history_id].push(item)
        } else {
          collectionData[item.history_id] = [item]
        }
      })
    }

    const data = {
      favoriteData,
      senderData,
      replyData,
      collectionData
    }

    await commit()
    return data
  } catch (error) {
    await rollback()
    return { error }
  }
};

const getExchange = async (user_id) => {
  console.log(user_id)
  await transaction()
  try {
    let queryString = `
    SELECT * FROM 
    (
    SELECT id AS roomid FROM room WHERE user_a = ?
    UNION
    SELECT id AS roomid FROM room WHERE user_b = ?
    ) AS roomlist
    LEFT JOIN
    \`exchange\` 
    ON roomlist.roomid = exchange.room_id
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
    await commit()
    return data
  } catch (error) {
    await rollback()
    return { error }
  }

};

async function getWaitingNoticeExchange(currentTime) {
  try {
    await transaction()
    let queryString = `
    SELECT * FROM(
      SELECT * 
      FROM exchange
      LEFT JOIN(
        SELECT id AS waitNoticeList_id, TIMESTAMPDIFF(MINUTE,CURRENT_TIMESTAMP,start_time) AS remainTime 
        FROM exchange
      ) AS waitNoticeList
      ON exchange.id = waitNoticeList.waitNoticeList_id 
      WHERE remainTime <= 10 AND status = 1 AND notice IN (1,2)
    ) AS waitNoticeExchange
    LEFT JOIN (
      SELECT id AS room_id, user_a,user_b 
      FROM room
    ) AS room
    ON room.room_id = waitNoticeExchange.room_id
    `
    const waitingNoticeExchange = await query(queryString)

    if (waitingNoticeExchange.length > 0) {
      //change the notice step by add 1
      const exchangeList = waitingNoticeExchange.map(exchange => exchange.id)
      queryString = `UPDATE exchange SET notice = notice + 1 WHERE id IN ?`
      await query(queryString, [[exchangeList]])

      //instant case(remainTime<0) need to send onStartNotice immediately
      //so, change to 3 directly
      const instantExchange = waitingNoticeExchange.map(exchange => {
        if (exchange.remainTime < 0) {
          return exchange.id
        }
      })
      queryString = `UPDATE exchange SET notice = 3 WHERE id IN ?`
      await query(queryString, [[instantExchange]])
    }

    await commit()
    return waitingNoticeExchange
  } catch (error) {
    await rollback()
    console.log(error)
    return error
  }

}

async function getUserListByRoom(roomList) {
  const queryString = `
    SELECT * FROM room WHERE id IN ?    
  `
  const result = await query(queryString, [[roomList]])
  return result
}

module.exports = {
  isEmailExist,
  signUp,
  nativeSignIn,
  getUserDetail,
  getGroupDetail,
  getFavorite,
  getExchange,
  getWaitingNoticeExchange,
  getUserListByRoom,
}
