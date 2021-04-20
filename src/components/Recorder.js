import React, { useState } from "react";
import "./Recorder.css";

function Recorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isRecorded, setIsRecorded] = useState(false);
  const [pronunciation, setPronunciation] = useState(null);

  let timeInterval = 3000; // in milliseconds
  let recording;
  let requesttimer;
  let sampleRate;
  var recLength = 0,
    recBuffer = [];

  async function startRecording() {
    setIsRecording(true);

    let stream = null;
    recording = true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      console.log(stream);

      const context = new (window.AudioContext || window.webkitAudioContext)();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(1024, 1, 1);

      source.connect(processor);
      processor.connect(context.destination);

      requesttimer = setInterval(exportBuffer, timeInterval);

      processor.onaudioprocess = function (e) {
        // From https://aws.amazon.com/blogs/machine-learning/capturing-voice-input-in-a-browser/
        if (!isRecording) {
          console.log("process");
          exportBuffer();
          clearInterval(requesttimer); // From https://www.w3schools.com/jsref/met_win_setinterval.asp
          context.close(); // From https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/close
        }
        // Do something with the data, e.g. convert it to WAV
        console.log("collect");
        sampleRate = e.inputBuffer.sampleRate;
        record2(e.inputBuffer.getChannelData(0)); // From https://aws.amazon.com/blogs/machine-learning/capturing-voice-input-in-a-browser/
      };
    } catch (err) {
      /* handle the error */
      console.log("Exception occured during recording!");
    }
  }

  function record2(inputBuffer) {
    recBuffer.push(inputBuffer[0]);
    recLength += inputBuffer[0].length;
  }

  function exportBuffer() {
    // Merge
    var mergedBuffers  = mergeBuffers(recBuffer, recLength);
    // Downsample
    var downsampledBuffer = downsampleBuffer(mergedBuffers, 16000);
    // Encode as a WAV
    var encodedWav = encodeWAV(downsampledBuffer);
    // Create Blob
    var audioBlob = new Blob([encodedWav], {type: 'application/octet-stream'});
    postMessage(audioBlob);
  }

  // From https://aws.amazon.com/blogs/machine-learning/capturing-voice-input-in-a-browser/
  // and https://github.com/mattdiamond/Recorderjs/
  function mergeBuffers(bufferArray, recLength) {
    var result = new Float32Array(recLength);
    var offset = 0;
    for (var i = 0; i < bufferArray.length; i++) {
      result.set(new Float32Array(bufferArray[i], 0, 4), offset);
      offset += bufferArray[i].length;
    }
    return result;
  }

  function downsampleBuffer(buffer) {
    if (16000 === sampleRate) {
      return buffer;
    }
    var sampleRateRatio = sampleRate / 16000;
    var newLength = Math.round(buffer.length / sampleRateRatio);
    var result = new Float32Array(newLength);
    var offsetResult = 0;
    var offsetBuffer = 0;
    while (offsetResult < result.length) {
      var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      var accum = 0,
        count = 0;
      for (
        var i = offsetBuffer;
        i < nextOffsetBuffer && i < buffer.length;
        i++
      ) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  function floatTo16BitPCM(output, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  }

  function encodeWAV(samples) {
    var buffer = new ArrayBuffer(44 + samples.length * 2);
    var view = new DataView(buffer);

    writeString(view, 0, "RIFF");
    view.setUint32(4, 32 + samples.length * 2, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, "data");
    view.setUint32(40, samples.length * 2, true);
    floatTo16BitPCM(view, 44, samples);

    return view;
  }

  function postMessage(data) {
    console.log(data);
    setPronunciation(data);
    recLength = 0;
    recBuffer = [];
  }

  function stopRecording() {
    setIsRecording(false);
    setIsRecorded(true);
    recording = false;

    console.log(recBuffer);

    //console.log(pronunciation);
  }

  function playRecording() {

    var myBlob = new Blob([pronunciation], { type: 'audio/mpeg' });
    const audioUrl = window.URL.createObjectURL(myBlob);
    const audio = new Audio(audioUrl);
    audio.play();
    // const audioUrl = window.URL.createObjectURL(pronunciation);
    //
    // console.log(audioUrl);
    // const audio = new Audio(audioUrl);
    // audio.play();
  }

  function deleteRecording() {
    setIsRecorded(false);
    setPronunciation(null);
  }

  return (
    <>
      <div className="LeftAligned">
        <div>
          <button
            className="btn btn-primary"
            onClick={startRecording}
            disabled={isRecording || isRecorded}
          >
            Record
          </button>
          &nbsp;&nbsp;&nbsp;
          <button
            className="btn btn-primary"
            onClick={stopRecording}
            disabled={!isRecording || isRecorded}
          >
            Stop
          </button>
        </div>
        &nbsp;&nbsp;&nbsp;
        <div className="InputRow">
          <audio controls={true} hidden={!isRecorded}></audio>
          &nbsp;&nbsp;&nbsp;
          <button
            className="btn btn-primary"
            onClick={playRecording}
            hidden={!isRecorded}
          >
            Play
          </button>
          &nbsp;&nbsp;&nbsp;
          <button
            className="btn btn-primary"
            onClick={deleteRecording}
            hidden={!isRecorded}
          >
            Delete
          </button>
        </div>
      </div>
    </>
  );
}

export default Recorder;
