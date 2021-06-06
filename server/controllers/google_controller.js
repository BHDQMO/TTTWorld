const Google = require('../../util/google')
const Chat = require('../models/chat_model')

const translate = async (req, res) => {
  historyId = req.body.historyId
  text = req.body.text
  target = req.body.target
  const translateResult = await Google.translateText(text, target)
  console.log(translateResult)
  await Chat.updateTranslate(historyId, translateResult)
  res.send({ data: translateResult })
}

module.exports = {
  translate
}