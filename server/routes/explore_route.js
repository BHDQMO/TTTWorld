const router = require('express').Router()

const {
  wrapAsync,
  authentication
} = require('../../util/util')

const { getUserList } = require('../controllers/explore_controller')

router.route('/explore/user_list')
  .get(authentication(), wrapAsync(getUserList))

module.exports = router
