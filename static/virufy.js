// CC BY @taisukef https://fukuno.jig.jp/

'use strict'

// audio

let audioContext = null
let audioStream = null

// audio data
const audioData = []
const bufferSize = 1024
let audio_sample_rate = 0

const stopAudio = async function() {
  if (!audioContext)
    return
  await audioContext.close()
  audioContext = null
  audioStream.getTracks().forEach(t => t.stop())
  audioStream = null
  btn.innerHTML = btn.bkInnerHTML
}
const saveAudio = async function() {
  download.href = exportWAV()
  download.download = 'recorded.wav'
  download.click()
}

// export WAV from audio float data
const getBlobWAV = function() {
  const encodeWAV = function(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2)
    const view = new DataView(buffer)
    const writeString = function(view, offset, string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }
    const floatTo16BitPCM = function (output, offset, input) {
      for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]))
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
      }
    }
    writeString(view, 0, 'RIFF')  // RIFF
    view.setUint32(4, 32 + samples.length * 2, true) // file size
    writeString(view, 8, 'WAVE') // WAVE
    writeString(view, 12, 'fmt ') // fmt chunk
    view.setUint32(16, 16, true) // size of fmt chknk
    view.setUint16(20, 1, true) // format ID
    view.setUint16(22, 1, true) // n channels
    view.setUint32(24, sampleRate, true) // sampling rate
    view.setUint32(28, sampleRate * 2, true) // byte per sec
    view.setUint16(32, 2, true) // size of block
    view.setUint16(34, 16, true) // bit per sample
    writeString(view, 36, 'data') // data chunk
    view.setUint32(40, samples.length * 2, true) // size of wave
    floatTo16BitPCM(view, 44, samples) // wave data
    return view
  }
  const mergeBuffers = function(audioData) {
    let sampleLength = 0
    for (let i = 0; i < audioData.length; i++) {
      sampleLength += audioData[i].length
    }
    const samples = new Float32Array(sampleLength)
    let sampleIdx = 0
    for (let i = 0; i < audioData.length; i++) {
      for (let j = 0; j < audioData[i].length; j++) {
        samples[sampleIdx++] = audioData[i][j]
      }
    }
    return samples
  }
  const dataview = encodeWAV(mergeBuffers(audioData), audio_sample_rate)
  const audioBlob = new Blob([ dataview ], { type: 'audio/wav' })
  //console.log(dataview)
  return audioBlob
}

const uploadAudio = async function() {
  const audioBlob = getBlobWAV()
  const myURL = window.URL || window.webkitURL
  const url = myURL.createObjectURL(audioBlob)

  for (;;) {
    try {
      const url = '/'
      const formdata = new FormData()
      formdata.append("file", audioBlob)
      const res = await (await fetch(url, { method: 'POST', body: formdata })).json()
      console.log(res)
      if (res.res == 'ok') {
        return res.id
      }
     alert("upload error, retry? (" + res.res + ") tap to retry")
    } catch (e) {
      alert("upload error, retry? (" + e + ") tap to retry")
    }
  }
}
const startAudio = async function() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
  audioStream = stream
  window.AudioContext = window.webkitAudioContext || window.AudioContext
  audioContext = new AudioContext()
  audio_sample_rate = audioContext.sampleRate // 44100 on Mac
  const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1)
  const mediastreamsource = audioContext.createMediaStreamSource(stream)
  mediastreamsource.connect(scriptProcessor)
  scriptProcessor.onaudioprocess = function(e) {
    const input = e.inputBuffer.getChannelData(0)
    const bufferData = new Float32Array(bufferSize)
    for (let i = 0; i < bufferSize; i++) {
      bufferData[i] = input[i]
    }
    audioData.push(bufferData)
  }
  scriptProcessor.connect(audioContext.destination)
}
// util
const sleep = async sec => new Promise(resolve => setTimeout(resolve, sec * 1000))
const show = function(s) {
  btn.innerHTML = s
}
const waitButtonPressed = async function() {
  btn.disabled = false
  return new Promise(resolve => {
    btn.onclick = function() {
      btn.disabled = true
      resolve()
    }
  })
}
const fix0 = function(s, len) {
  s = "0000000000000000000" + s
  return s.substring(s.length - len)
}
