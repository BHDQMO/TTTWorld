"use strict";

const startButton = document.getElementById("startButton");
const callButton = document.getElementById("callButton");
const hangupButton = document.getElementById("hangupButton");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

callButton.disabled = true;
hangupButton.disabled = true;

startButton.addEventListener("click", start);
callButton.addEventListener("click", call);
hangupButton.addEventListener("click", hangup);

let localStream;
let pc1;
let pc2;

const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1,
};

async function start() {
  startButton.disabled = true;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    localVideo.srcObject = localStream; //顯示到頁面上
    callButton.disabled = false;
  } catch (e) {
    alert(`getUserMedia() error: ${e.name}`);
  }
}

/**
 * pc1,pc2 => peer-to-peer connection流程
 * step1: 建立Local peer connection  => signalingState: "statable"
 * step1.5: 將stream track 與peer connection 透過addTrack()關聯起來，之後建立連結才能進行傳輸！
 * step2: local peer call createOffer methods to create RTCSessionDescription(SDP) => signalingState: "have-local-offer"
 * step3: setLocalDescription() is called 然後傳給remote peer
 * step4: remote peer 收到後透過setRemoteDescription() 建立description for local peer.
 * step5: 建立成功後local peer會觸發icecandidate event 就能將serialized candidate data 通過signaling channel交付給remote peer
 * step6: Remote peer 建立createAnswer 將自己的SDP 回傳給Local peer
 * step7: Local peer收到後透過setRemoteDescription() 建立description for remote peer
 * Ping ! p2p 完成
 */

async function call() {
  callButton.disabled = true;
  hangupButton.disabled = false;

  pc1 = buildPeerConnection("pc1"); //建立連線並互相把connection丟到ICE agent
  pc2 = buildPeerConnection("pc2"); //建立連線並互相把connection丟到ICE agent
  pc2.ontrack = gotRemoteStream //ontrack is an EventHandler

  localStream.getTracks().forEach((track) => pc1.addTrack(track, localStream)); //把localStream加進去pc1這個RTCPeerConnection裡面的localstream

  try {
    const offer = await pc1.createOffer(offerOptions); //創建新的offer以開始新的WebRTC連線
    await pc1.setLocalDescription(offer);
    await pc2.setRemoteDescription(offer);
    const answer = await pc2.createAnswer();
    await pc2.setLocalDescription(answer);
    await pc1.setRemoteDescription(answer);
  } catch (e) {
    // onCreateSessionDescriptionError(e);
  }
}

function hangup() {
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
  startButton.disabled = false;
}

const audioTracks = localStream.getAudioTracks(); //應該就是我要傳回去server的東西

// var options = {
//   mimeType: "audio/webm; codecs=vp9"
// };
// mediaRecorder = new MediaRecorder(stream, options);

/**
 *  when an RTCIceCandidate has been identified 
 *  and added to the local peer by a call to `RTCPeerConnection.setLocalDescription()`.
 *  言下之意： 當local peer有新的candidate建立時，要交付給remote peers
 */
function buildPeerConnection(label) {
  const peer = new RTCPeerConnection();
  peer.onicecandidate = (e) => onIceCandidate(label, e); //onicecandidate is an EventHandler
  peer.oniceconnectionstatechange = (e) => onIceStateChange(label, e); //oniceconnectionstatechange is an EventHandler
  return peer;
}

async function onIceCandidate(pc, event) {
  try {
    await getOtherPc(pc).addIceCandidate(event.candidate); //delivers the newly-received candidate to the browser's ICE agent
  } catch (e) {
    console.log(`${getName(pc)} failed to add ICE Candidate: ${error.toString()}`);
  }
  console.log(
    `${getName(pc)} ICE candidate:\n
    ${event.candidate ? event.candidate.candidate : "(null)"}`
  );
}

function onIceStateChange(pc, event) {
  if (pc) {
    console.log(`${getName(pc)} ICE state: ${pc.iceConnectionState}`);
    console.log("ICE state change event: ", event);
  }
}

function getOtherPc(pc) {
  return pc === pc1 ? pc2 : pc1;
}

function getName(pc) {
  return pc === pc1 ? "pc1" : "pc2";
}

function gotRemoteStream(e) {
  if (remoteVideo.srcObject !== e.streams[0]) {
    remoteVideo.srcObject = e.streams[0];
  }
}

function onCreateSessionDescriptionError(error) {
  console.log(`Failed to create session description: ${error.toString()}`);
}

function getSelectedSdpSemantics() {
  const sdpSemanticsSelect = document.querySelector("#sdpSemantics");
  const option = sdpSemanticsSelect.options[sdpSemanticsSelect.selectedIndex];
  return option.value === "" ? {} : {
    sdpSemantics: option.value
  };
}

function onSetLocalSuccess(pc) {
  console.log(`${getName(pc)} setLocalDescription complete`);
}

function onSetRemoteSuccess(pc) {
  console.log(`${getName(pc)} setRemoteDescription complete`);
}

function onSetSessionDescriptionError(error) {
  console.log(`Failed to set session description: ${error.toString()}`);
}