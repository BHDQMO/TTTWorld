require('dotenv')
const fetch = require('node-fetch');
const { Translate } = require('@google-cloud/translate').v2;
const { SpeechClient } = require('@google-cloud/speech');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID
const GOOGLE_KEY_FILE = process.env.GOOGLE_KEY_FILE

var config = {
  projectId: GOOGLE_PROJECT_ID,
  keyFilename: GOOGLE_KEY_FILE
};

const translate = new Translate(config);
const speechClient = new SpeechClient;

const translateText = async (text, target) => {
  let [translations] = await translate.translate(text, target);
  return translations = Array.isArray(translations) ? translations : [translations];
};

const translateAudio = async (request) => {
  console.log(request.config)
  const [response] = await speechClient.recognize(request);
  console.log(response)
  return transcription = response.results
    .map(result => result.alternatives[0].transcript)
    .join('\n');
};

// async function listLanguages() {
//   const [languages] = await translate.getLanguages();
//   languages.forEach(language => console.log(language));
// }
// listLanguages();

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
  translateAudio,
  geocoding
};