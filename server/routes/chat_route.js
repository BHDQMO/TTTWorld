const router = require('express').Router();

const {
  wrapAsync,
  authentication
} = require('../../util/util')

const {
  translateText,
  getFriendList,
  getHistory
} = require('../controllers/chat_controller');

router.route('/chat/translate')
  .post(translateText);

router.route('/chat/friend')
  .get(authentication(), wrapAsync(getFriendList))

router.route('/chat/history')
  .get(authentication(), wrapAsync(getHistory))

module.exports = router;