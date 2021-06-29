const fs = require('fs')

const { Storage } = require('@google-cloud/storage')
const Google = require('../../util/google')
const Chat = require('../models/chat_model')
const { removeFile } = require('../../util/util')

const {
  GOOGLE_PROJECT_ID,
  GOOGLE_KEY_FILE_DEVELOP,
  GOOGLE_KEY_FILE_PRODUCT,
  NODE_ENV
} = process.env

const storageConfig = {
  projectId: GOOGLE_PROJECT_ID
}

if (NODE_ENV === 'production') {
  storageConfig.keyFilename = GOOGLE_KEY_FILE_PRODUCT
} else {
  storageConfig.keyFilename = GOOGLE_KEY_FILE_DEVELOP
}

// Imports the Google Cloud client library.

// Instantiates a client. Explicitly use service account credentials by
// specifying the private key file. All clients in google-cloud-node have this
// helper, see https://github.com/GoogleCloudPlatform/google-cloud-node/blob/master/docs/authentication.md
// const projectId = 'project-id'
// const keyFilename = '/path/to/keyfile.json'
const storage = new Storage(storageConfig)

// Makes an authenticated API request.
async function listBuckets() {
  try {
    const [buckets] = await storage.getBuckets()

    console.log('Buckets:')
    buckets.forEach((bucket) => {
      console.log(bucket.name)
    })
  } catch (err) {
    console.error('ERROR:', err)
  }
}
listBuckets()

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
    let historyId = req.get('history_Id')
    historyId = parseInt(historyId)

    let transcript = await Chat.getTranslate(historyId)
    console.log(transcript)
    if (transcript) {
      res.send({ transcript })
    } else {
      const pathname = `${Date.now()}${req.user.user_id}.ogg`
      fs.writeFileSync(pathname, body)
      try {
        transcript = await Google.transcriptAudio(pathname, languageCode)
        res.send({ transcript })
        console.log({ historyId, transcript })
        Chat.updateTranslate(historyId, transcript)
        removeFile(pathname)
      } catch (error) {
        console.log(error)
        removeFile(pathname)
        res.send({ error: 'Please use Windows 10 environment as the input device' })
      }
    }
  })
}

module.exports = {
  getTranslate,
  getTranscript
}
