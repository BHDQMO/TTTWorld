const router = require('express').Router();

const {
  upload,
  wrapAsync,
  authentication
} = require('../../util/util')

const cpUpload = upload.fields([{
  name: 'picture',
  maxCount: 1
}])

const {
  translateText,
  getFriendList,
  getHistory,
  createExchange
} = require('../controllers/chat_controller');

router.route('/chat/translate')
  .post(translateText);

router.route('/chat/friend')
  .get(authentication(), wrapAsync(getFriendList))

router.route('/chat/history')
  .get(authentication(), wrapAsync(getHistory))

// router.route('/chat/exchange')
//   .post(cpUpload, wrapAsync(createExchange))

module.exports = router;