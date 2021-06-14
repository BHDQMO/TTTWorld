require('dotenv')
const fetch = require('node-fetch');
const { Translate } = require('@google-cloud/translate').v2;
const speech = require('@google-cloud/speech');
const fs = require('fs');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID
const GOOGLE_KEY_FILE = process.env.GOOGLE_KEY_FILE

var config = {
  projectId: GOOGLE_PROJECT_ID,
  keyFilename: GOOGLE_KEY_FILE
};

const translateText = async (text, target) => {
  const translate = new Translate(config);
  let [translations] = await translate.translate(text, target);
  return translations = Array.isArray(translations) ? translations : [translations];
};

const transcript = async (filename, languageCode) => {
  const client = new speech.SpeechClient();

  const config = {
    encoding: 'WEBM_OPUS',
    // encoding: 'OGG_OPUS',
    languageCode: languageCode
  };

  const audio = {
    content: fs.readFileSync(filename).toString('base64'),
  };

  const request = {
    config: config,
    audio: audio,
  };

  // Detects speech in the audio file. This creates a recognition job that you
  // can wait for now, or get its result later.
  const [operation] = await client.longRunningRecognize(request);
  // console.log(operation)
  // Get a Promise representation of the final result of the job
  const [response] = await operation.promise();
  const transcription = response.results
    .map(result => result.alternatives[0].transcript)
    .join('\n');

  return transcription
};

const geocoding = async (address) => {
  if (address) {
    address = address.replace(' ', '+')
    url = encodeURI(`https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${GOOGLE_API_KEY}`)
    const result = await fetch(url, { method: 'GET' })
      .then(res => res.json())
      .then(res => {
        const location = res.results[0].geometry.location
        const lat = location.lat
        const lng = location.lng
        const geocode = '' + lng + ' ' + lat
        return geocode
      })
    return result
  } else {
    return new Error('address is required')
  }
}

module.exports = {
  translateText,
  transcript,
  geocoding
};