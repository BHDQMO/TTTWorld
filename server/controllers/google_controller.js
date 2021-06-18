const fs = require('fs')

const Google = require('../../util/google')
const Chat = require('../models/chat_model')
const { removeFile } = require('../../util/util')

const getTranslate = async (req, res) => {
  const { historyId, text } = req.body

  // change zh language code to zh-TW
  let target = req.body.target.split('-')[0]
  if (target === 'zh') { target = 'zh-TW' }

  const translateResult = await Google.translateText(text, target)
  await Chat.updateTranslate(historyId, translateResult)
  res.send({ data: translateResult })
}

const getTranscript = async (req, res) => {
  let body = Buffer.from([])

  req.on('data', (data) => {
    body = Buffer.concat([body, data])
  })

  req.on('end', async () => {
    const languageCode = req.get('targetLang')
    const historyId = req.get('history_Id')

    let transcript = await Chat.getTranslate(historyId)
    if (transcript) {
      res.send({ transcript })
    } else {
      const pathname = `${Date.now()}${req.user.user_id}.ogg`
      fs.writeFileSync(pathname, body)
      try {
        transcript = await Google.transcript(pathname, languageCode)
        res.send({ transcript })
        Chat.updateTranslate(historyId, transcript)
        removeFile(pathname)
      } catch (error) {
        console.log(error)
        removeFile(pathname)
        res.send({ error: 'Only support "WEBM_OPUS" encoded file' })
      }
    }
  })
}

module.exports = {
  getTranslate,
  getTranscript
}
