const { google } = require('@google-cloud/translate/build/protos/protos');
const { Translate } = require('@google-cloud/translate').v2; // Imports the Google Cloud client library
const { SpeechClient } = require('@google-cloud/speech');

const translateText = async (text, target) => {
  const translate = new Translate();
  let [translations] = await translate.translate(text, target);
  return translations = Array.isArray(translations) ? translations : [translations];
};

const translateAudio = async (request) => {
  console.log(request.config)
  const speechClient = new SpeechClient;
  const [response] = await speechClient.recognize(request);
  console.log(response)
  return transcription = response.results
    .map(result => result.alternatives[0].transcript)
    .join('\n');
};

module.exports = {
  translateText,
  translateAudio
};