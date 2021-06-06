const router = require('express').Router()

const {
  upload,
  wrapAsync,
} = require('../../util/util')

const {
  translate,
} = require('../controllers/google_controller')

router.route('/google/translate')
  .post(wrapAsync(translate))

module.exports = router