const router = require('express').Router()

const {
  upload,
  wrapAsync,
  authentication,
} = require('../../util/util')

const {
  translate,
  transcript,
} = require('../controllers/google_controller')

router.route('/google/translate')
  .post(authentication(), wrapAsync(translate))

router.route('/google/transcript')
  .post(authentication(), wrapAsync(transcript))

module.exports = router