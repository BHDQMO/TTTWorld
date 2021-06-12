const fs = require('fs');

const Google = require('../../util/google')
const Chat = require('../models/chat_model')

const translate = async (req, res) => {
  historyId = req.body.historyId
  text = req.body.text
  target = req.body.target
  const translateResult = await Google.translateText(text, target)
  await Chat.updateTranslate(historyId, translateResult)
  res.send({ data: translateResult })
}

const transcript = async (req, res) => {
  var body = Buffer.from([]);

  req.on('data', function (data) {
    body = Buffer.concat([body, data]);
  });

  req.on('end', async function () {
    const languageCode = req.get('targetLang')
    const history_Id = req.get('history_Id')

    let transcript = await Chat.getTranslate(history_Id)

    if (transcript) {
      res.send({ transcript })
    } else {
      var pathname = `${Date.now()}${req.user.user_id}.ogg`;
      fs.writeFileSync(pathname, body);
      transcript = await Google.transcript(pathname, languageCode)
      res.send({ transcript })
      // Chat.updateTranslate(history_Id, transcript)
      fs.unlink(pathname, (error) => {
        if (error) {
          console.log(error)
        }
      })
    }
  })
}

module.exports = {
  translate,
  transcript
}