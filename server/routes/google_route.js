const router = require('express').Router()

const {
  wrapAsync,
  authentication
} = require('../../util/util')

const Google = require('../controllers/google_controller')

router.route('/google/translate')
  .post(authentication(), wrapAsync(Google.getTranslate))

router.route('/google/transcript')
  .post(authentication(), wrapAsync(Google.getTranscript))

module.exports = router
