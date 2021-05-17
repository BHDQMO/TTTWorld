const mediaStreamConstraints = {
  audio: true,
  video: true
};

function gotLocalMediaStream(mediaStream) {
  const localVideo = document.getElementById("localVideo");

  // Older browsers may not have srcObject.
  if ("srcObject" in localVideo) {
    localVideo.srcObject = mediaStream;
  } else {
    // Avoid using this in new browsers, as it is going away.
    localVideo.src = window.URL.createObjectURL(mediaStream);
  }

  // 螢幕截圖
  const screenshotButton = document.querySelector('#screenshot-button');
  const canvas = document.querySelector('canvas');
  screenshotButton.onclick = localVideo.onclick = function () {
    canvas.width = localVideo.videoWidth;
    canvas.height = localVideo.videoHeight;
    canvas.getContext('2d').drawImage(localVideo, 0, 0, canvas.width, canvas.height);
  }
}

function handleMediaStreamError(error) {
  console.log('navigator.getUserMedia error: ', error);
}

navigator.mediaDevices.getUserMedia(mediaStreamConstraints) //取得 MediaStream object
  .then(gotLocalMediaStream)
  .catch(handleMediaStreamError)

var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
let speechRecognitionButton = document.querySelector('#speechRecognition');
let recognitionResult = document.querySelector('#recognitionResult');
speechRecognitionButton.addEventListener('click', speechRecognition);

function speechRecognition() {
  speechRecognitionButton.disabled = true;
  speechRecognitionButton.textContent = 'Test in progress';
  recognitionResult.textContent = '';

  var recognition = new SpeechRecognition();
  recognition.lang = 'cmn-Hant-TW';
  recognition.interimResults = false;
  recognition.continuous = true;
  recognition.maxAlternatives = 1;
  
  recognition.start(); // 如果可以讓他抓得到file播放的聲音，那就沒問題了
  recognition.onresult = function (event) {
    let lastIndex = event.results.length - 1
    var speechResult = event.results[lastIndex][0].transcript.toLowerCase(); //這一段就是翻譯出來的結果，
    // recognitionResult.textContent = 'Speech received: ' + speechResult + '.';
    console.log('Confidence: ' + event.results[lastIndex][0].confidence + ' ' + speechResult);
  }

  recognition.onspeechend = function () {
    recognition.stop();
    speechRecognitionButton.disabled = false;
    speechRecognitionButton.textContent = 'Start new test';
  }

  recognition.onerror = function (event) {
    speechRecognitionButton.disabled = false;
    speechRecognitionButton.textContent = 'Start new test';
    recognitionResult.textContent = 'Error occurred in recognition: ' + event.error;
  }

  recognition.onaudiostart = function (event) {
    //Fired when the user agent has started to capture audio.
    console.log('SpeechRecognition.onaudiostart');
  }

  recognition.onaudioend = function (event) {
    //Fired when the user agent has finished capturing audio.
    console.log('SpeechRecognition.onaudioend');
  }

  recognition.onend = function (event) {
    //Fired when the speech recognition service has disconnected.
    console.log('SpeechRecognition.onend');
  }

  recognition.onnomatch = function (event) {
    //Fired when the speech recognition service returns a final result with no significant recognition. This may involve some degree of recognition, which doesn't meet or exceed the confidence threshold.
    console.log('SpeechRecognition.onnomatch');
  }

  recognition.onsoundstart = function (event) {
    //Fired when any sound — recognisable speech or not — has been detected.
    console.log('SpeechRecognition.onsoundstart');
  }

  recognition.onsoundend = function (event) {
    //Fired when any sound — recognisable speech or not — has stopped being detected.
    console.log('SpeechRecognition.onsoundend');
  }

  recognition.onspeechstart = function (event) {
    //Fired when sound that is recognised by the speech recognition service as speech has been detected.
    console.log('SpeechRecognition.onspeechstart');
  }
  recognition.onstart = function (event) {
    //Fired when the speech recognition service has begun listening to incoming audio with intent to recognize grammars associated with the current SpeechRecognition.
    console.log('SpeechRecognition.onstart');
  }
}