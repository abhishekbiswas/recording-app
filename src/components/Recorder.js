import React, { useState, createRef } from "react";
import "./Recorder.css";

const encodeAfterRecord = true;

function Recorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isRecorded, setIsRecorded] = useState(false);
  const [pronunciation, setPronunciation] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [stream, setStream] = useState(null);
  const [recorder, setRecorder] = useState(null);
  const audioRef = createRef();

  async function startRecording() {
    setIsRecording(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      setStream(stream);

      const context = new (window.AudioContext || window.webkitAudioContext)();
      const input = context.createMediaStreamSource(stream);

      const recorder = new window.WebAudioRecorder(input, {
        workerDir: "/", // must end with slash
        encoding: "wav",
        numChannels: 2, //2 is the default, mp3 encoding supports only 2
        onEncoderLoading: function (recorder, encoding) {
          // show "loading encoder..." display
          console.log("Loading " + encoding + " encoder...");
        },
        onEncoderLoaded: function (recorder, encoding) {
          // hide "loading encoder..." display
          console.log(encoding + " encoder loaded");
        },
      });

      setRecorder(recorder);

      recorder.onComplete = function (recorder, blob) {
        console.log("Encoding complete");
        setBlobUrl(URL.createObjectURL(blob));
      };

      recorder.setOptions({
        timeLimit: 120,
        encodeAfterRecord: encodeAfterRecord,
        ogg: { quality: 0.5 },
        mp3: { bitRate: 160 },
      });

      //start the recording process
      recorder.startRecording();
    } catch (err) {
      /* handle the error */
      console.log("Exception occured during recording!");
      setIsRecording(false);
    }
  }

  function stopRecording() {
    stream.getAudioTracks()[0].stop();
    setIsRecording(false);
    setIsRecorded(true);

    recorder.finishRecording();
  }

  function playRecording() {
    audioRef.current.play();
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
          <audio
            controls={true}
            hidden={!isRecorded}
            src={blobUrl}
            ref={audioRef}
          ></audio>
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
