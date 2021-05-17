const router = require('express').Router();

const {
  translateText,
} = require('../controllers/chat_controller.js');

router.route('/chat/translate')
  .post(translateText);

module.exports = router;