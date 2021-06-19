require('dotenv')
const fetch = require('node-fetch')
const { Translate } = require('@google-cloud/translate').v2
const speech = require('@google-cloud/speech')
const fs = require('fs')

const { GOOGLE_API_KEY } = process.env
const { GOOGLE_PROJECT_ID } = process.env
const { GOOGLE_KEY_FILE } = process.env

const translateConfig = {
  projectId: GOOGLE_PROJECT_ID,
  keyFilename: GOOGLE_KEY_FILE
}

const translateText = async (text, target) => {
  const translate = new Translate(translateConfig)
  const [translations] = await translate.translate(text, target)
  return Array.isArray(translations) ? translations : [translations]
}

const transcriptAudio = async (filename, languageCode) => {
  const client = new speech.SpeechClient()

  const config = {
    encoding: 'WEBM_OPUS',
    languageCode
  }

  const audio = {
    content: fs.readFileSync(filename).toString('base64')
  }

  const request = {
    config,
    audio
  }

  // Detects speech in the audio file. This creates a recognition job that you
  // can wait for now, or get its result later.
  const [operation] = await client.longRunningRecognize(request)
  // Get a Promise representation of the final result of the job
  const [response] = await operation.promise()
  const transcription = response.results
    .map((result) => result.alternatives[0].transcript)
    .join('\n')
  return transcription
}

const geocoding = async (address) => {
  if (address) {
    address.replace(' ', '+')
    const url = encodeURI(`https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${GOOGLE_API_KEY}`)
    const result = await fetch(url, { method: 'GET' })
      .then((res) => res.json())
      .then((res) => {
        const { location } = res.results[0].geometry
        const { lat } = location
        const { lng } = location
        const geocode = `${lng} ${lat}`
        return geocode
      })
    return result
  }
  return new Error('address is required')
}

module.exports = {
  translateText,
  transcriptAudio,
  geocoding
}
