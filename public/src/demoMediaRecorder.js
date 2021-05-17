const record = document.querySelector('.record')
const stop = document.querySelector('.stop')
const soundClips = document.querySelector('.sound-clips')
const canvas = document.querySelector('.visualizer')
const mainSection = document.querySelector('.main-controls')

stop.disabled = true

let audioCtx
const canvasCtx = canvas.getContext("2d")

if (navigator.mediaDevices.getUserMedia) { //支援mediaDevices 應該要串一下adapter
  console.log('getUserMedia supported.')

  let chunks = []

  let onSuccess = function (stream) { //成功取得Stream之後
    visualize(stream) //視覺化這個stream

    const mediaRecorder = new MediaRecorder(stream) //創建新的錄音器
    let recTimeoutId

    const stopRec = function () {
      console.log(recTimeoutId)
      clearTimeout(recTimeoutId)
      mediaRecorder.stop()
      console.log(mediaRecorder.state)
      console.log("recorder stopped")
      record.style.background = ""
      record.style.color = ""
      stop.disabled = true
      record.disabled = false
    }

    record.onclick = function () { //起點
      mediaRecorder.start(1000)
      console.log(mediaRecorder.state)
      console.log("recorder started")
      record.style.background = "red"

      stop.disabled = false
      record.disabled = true

      recTimeoutId = setTimeout(stopRec, 2 * 1000)
    }

    stop.onclick = stopRec

    mediaRecorder.ondataavailable = function (e) { //stop() end() reuestData() start(timeslice)
      console.log(mediaRecorder)
      chunks.push(e.data) //推進去chunk這個array裡面
    }

    mediaRecorder.onstop = function (e) {
      console.log("data available after MediaRecorder.stop() called.")

      const clipName = prompt('Enter a name for your sound clip?', 'My unnamed clip')

      const clipContainer = document.createElement('article')
      const clipLabel = document.createElement('p')
      const audio = document.createElement('audio')
      const deleteButton = document.createElement('button')

      clipContainer.classList.add('clip')
      audio.setAttribute('controls', '')
      deleteButton.textContent = 'Delete'
      deleteButton.className = 'delete'

      if (clipName === null) {
        clipLabel.textContent = 'My unnamed clip'
      } else {
        clipLabel.textContent = clipName
      }

      clipContainer.appendChild(audio)
      clipContainer.appendChild(clipLabel)
      clipContainer.appendChild(deleteButton)
      soundClips.appendChild(clipContainer)

      audio.controls = true
      const blob = new Blob(chunks, {
        'type': 'audio/ogg codecs=opus'
      })
      chunks = []
      const audioURL = window.URL.createObjectURL(blob) //取得這則msg我回傳的blob要用這個method播放出來
      audio.src = audioURL
      console.log("recorder stopped")

      deleteButton.onclick = function (e) {
        let evtTgt = e.target
        evtTgt.parentNode.parentNode.removeChild(evtTgt.parentNode)
      }

      clipLabel.onclick = function () {
        const existingName = clipLabel.textContent
        const newClipName = prompt('Enter a new name for your sound clip?')
        if (newClipName === null) {
          clipLabel.textContent = existingName
        } else {
          clipLabel.textContent = newClipName
        }
      }
    }
  }

  let onError = function (err) {
    console.log('The following error occured: ' + err)
  }

  const constraints = {
    audio: true
  }
  navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError)


} else {
  console.log('getUserMedia not supported on your browser!')
}

function visualize(stream) {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }

  const source = audioCtx.createMediaStreamSource(stream)

  const analyser = audioCtx.createAnalyser()
  analyser.fftSize = 2048
  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)

  source.connect(analyser)
  //analyser.connect(audioCtx.destination)

  draw()

  function draw() {
    const WIDTH = canvas.width
    const HEIGHT = canvas.height

    requestAnimationFrame(draw)

    analyser.getByteTimeDomainData(dataArray)

    canvasCtx.fillStyle = 'rgb(200, 200, 200)'
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT)

    canvasCtx.lineWidth = 2
    canvasCtx.strokeStyle = 'rgb(0, 0, 0)'

    canvasCtx.beginPath()

    let sliceWidth = WIDTH * 1.0 / bufferLength
    let x = 0

    for (let i = 0; i < bufferLength; i++) {
      let v = dataArray[i] / 128.0
      let y = v * HEIGHT / 2

      if (i === 0) {
        canvasCtx.moveTo(x, y)
      } else {
        canvasCtx.lineTo(x, y)
      }

      x += sliceWidth
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2)
    canvasCtx.stroke()

  }
}

window.onresize = function () {
  canvas.width = mainSection.offsetWidth
}

window.onresize()