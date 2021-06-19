const router = require('express').Router()

const {
  upload,
  wrapAsync,
  authentication
} = require('../../util/util')

const cpUpload = (req, res, next) => {
  upload.fields([
    { name: 'picture', maxCount: 1 }
  ])(req, res, (error) => {
    if (error) {
      res.send({ error: error.message })
    } else {
      next()
    }
  })
}

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
