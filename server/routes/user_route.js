const router = require('express').Router()

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
  signUp,
  signIn,
  getUserProfile
} = require('../controllers/user_controller')

router.route('/user/signup')
  .post(cpUpload, wrapAsync(signUp))

router.route('/user/signin')
  .post(cpUpload, wrapAsync(signIn))

router.route('/user/profile')
  .get(authentication(), wrapAsync(getUserProfile))

module.exports = router