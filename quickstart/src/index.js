'use strict';

var Video = require('twilio-video');

var activeRoom;
var previewTracks;
var identity;
var roomName;

// Attach the Tracks to the DOM.
function attachTracks(tracks, container) {
  tracks.forEach(function(track) {
    container.appendChild(track.attach());
  });
}

// Attach the Participant's Tracks to the DOM.
function attachParticipantTracks(participant, container) {
  var tracks = Array.from(participant.tracks.values());
  attachTracks(tracks, container);
}

// Detach the Tracks from the DOM.
function detachTracks(tracks) {
  tracks.forEach(function(track) {
    track.detach().forEach(function(detachedElement) {
      detachedElement.remove();
    });
  });
}

// Detach the Participant's Tracks from the DOM.
function detachParticipantTracks(participant) {
  var tracks = Array.from(participant.tracks.values());
  detachTracks(tracks);
}

// When we are about to transition away from this page, disconnect
// from the room, if joined.
window.addEventListener('beforeunload', leaveRoomIfJoined);

// Obtain a token from the server in order to connect to the Room.
$.getJSON('/token', function(data) {
  // identity = data.identity;
  document.getElementById('room-controls').style.display = 'block';

  // Bind button to join Room.
  document.getElementById('button-join').onclick = function() {
    roomName = document.getElementById('room-name').value;
    if (!roomName) {
      alert('Please enter a room name.');
      return;
    }

    log("Joining room '" + roomName + "'...");
    var connectOptions = {
      name: roomName,
      logLevel: 'debug'
    };

    if (previewTracks) {
      connectOptions.tracks = previewTracks;
    }

    // Join the Room with the token from the server and the
    // LocalParticipant's Tracks.
    Video.connect(data.token, connectOptions).then(roomJoined, function(error) {
      log('Could not connect to Twilio: ' + error.message);
    });
  };

  // Bind button to leave Room.
  document.getElementById('button-leave').onclick = function() {
    log('Leaving room...');
    activeRoom.disconnect();
  };
});

function gotDevices(mediaDevices) {
  var select = document.getElementById( "video-devices" );
  select.innerHTML = '';
  select.appendChild(document.createElement('option'));
  let count = 1;
  mediaDevices.forEach(mediaDevice => {
    if (mediaDevice.kind === 'videoinput') {
      var option = document.createElement('option');
      option.value = mediaDevice.deviceId;
      var label = mediaDevice.label || `Camera ${count++}`;
      var textNode = document.createTextNode(label);
      option.appendChild(textNode);
      select.appendChild(option);
    }
  });
}

function updateVideoDevice(event) {
  var select = document.getElementById('video-devices');
  var localParticipant = room.localParticipant;
  if (select.value !== '') {
    Video.createLocalVideoTrack({
      deviceId: { exact: select.value }
    }).then(function(localVideoTrack) {
      var tracks = Array.from(localParticipant.videoTracks.values());
      localParticipant.unpublishTracks(tracks);
      localParticipant.publishTrack(localVideoTrack);

      roomJoined(activeRoom);
      });
  
  }
}

// Successfully connected!
function roomJoined(room) {
  window.room = activeRoom = room;

  navigator.mediaDevices.enumerateDevices().then(gotDevices);
  var select = document.getElementById('video-devices');
  select.addEventListener('change', updateVideoDevice);

  log("Joined as '" + identity + "'");
  document.getElementById('button-join').style.display = 'none';
  document.getElementById('button-leave').style.display = 'inline';

  // Attach LocalParticipant's Tracks, if not already attached.
  var previewContainer1 = document.getElementById('local-div1');
  if (!previewContainer1.querySelector('video')) {
    attachParticipantTracks(activeRoom.localParticipant, previewContainer1);
  }else{
    previewContainer1.querySelector('video').remove();
    attachParticipantTracks(activeRoom.localParticipant, previewContainer1);
  }

  var previewContainer2 = document.getElementById('local-div2');
  if (!previewContainer2.querySelector('video')) {
    attachParticipantTracks(activeRoom.localParticipant, previewContainer2);
  }else{
    previewContainer2.querySelector('video').remove();
    attachParticipantTracks(activeRoom.localParticipant, previewContainer2);
  }


  // Attach the Tracks of the Room's Participants.
  room.participants.forEach(function(participant) {
  log("Already in Room: '" + participant.identity + "'");
  var remoteCameraContainer = document.getElementById('remote-media');
    if (!remoteCameraContainer.querySelector('video')) {
    attachParticipantTracks(participant, remoteCameraContainer);
    }else{
    remoteCameraContainer.querySelector('video').remove();
    attachParticipantTracks(participant, remoteCameraContainer);
    }
   });

  // When a Participant joins the Room, log the event.
  room.on('participantConnected', function(participant) {
    log("Joining: '" + participant.identity + "'");
  });

  // When a Participant adds a Track, attach it to the DOM.
  room.on('trackAdded', function(track, participant) {
    log(participant.identity + " added track: " + track.kind);
    var remoteCameraContainer2 = document.getElementById('remote-media');
    attachTracks([track], remoteCameraContainer2);
  });

  // When a Participant removes a Track, detach it from the DOM.
  room.on('trackRemoved', function(track, participant) {
    log(participant.identity + " removed track: " + track.kind);
    detachTracks([track]);
  });

  room.localParticipant.on('trackRemoved', function(track) {
    log(room.localParticipant.identity + " removed track: " + track.kind);
    detachTracks([track]);
  });

  room.localParticipant.on('trackAdded', function(track) {
    log(room.localParticipant.identity + " added track: " + track.kind);
    var previewContainer1 = document.getElementById('local-div1');
    attachTracks([track], previewContainer1);
  })

  room.localParticipant.on('trackAdded', function(track) {
    log(room.localParticipant.identity + " added track: " + track.kind);
    var previewContainer2 = document.getElementById('local-div2');
    attachTracks([track], previewContainer2);
  })

  // When a Participant leaves the Room, detach its Tracks.
  room.on('participantDisconnected', function(participant) {
    log("Participant '" + participant.identity + "' left the room");
    detachParticipantTracks(participant);
  });

  // Once the LocalParticipant leaves the room, detach the Tracks
  // of all Participants, including that of the LocalParticipant.
  room.on('disconnected', function() {
    log('Left');
    if (previewTracks) {
      previewTracks.forEach(function(track) {
        track.stop();
      });
    }
    detachParticipantTracks(room.localParticipant);
    room.participants.forEach(detachParticipantTracks);
    activeRoom = null;
    document.getElementById('button-join').style.display = 'inline';
    document.getElementById('button-leave').style.display = 'none';
    select.removeEventListener('change', updateVideoDevice);
  });
}


// Activity log.
function log(message) {
  var logDiv = document.getElementById('log');
  logDiv.innerHTML += '<p>&gt;&nbsp;' + message + '</p>';
  logDiv.scrollTop = logDiv.scrollHeight;
}

// Leave Room.
function leaveRoomIfJoined() {
  if (activeRoom) {
    activeRoom.disconnect();
  }
}



//Actions and functionality for control panel

  var currentToggle = "true";

  $(function() {
    $('#toggleForm').change(function() {
      currentToggle = '' + $(this).prop('checked');
    })
  });

  $(function() {
    $( "#submitButton" ).click(function() {
        console.log(currentToggle);
        if(currentToggle == "true"){
          //true indicats Patient
          identity = $('#userName').val().toString();
          if(identity == ''){
            alert("Please Enter a Name!")
          }else{
            $("#overlay").hide();
            // console.log(identity);
            setPatientSettings(identity);
          } 

        }else{
          //false indicates Doctor 
          identity = $('#userName').val().toString();
          if(identity == ''){
            alert("Please Enter a Name!")
          }else{
            $("#overlay").hide();
            // console.log(identity);
            setDoctorSettings(identity);
          } 
        }
      });
    });

  function setPatientSettings(name){
    //Patient sees themselves in the big screen, and the doctor in the little screen
    //<local
  }

  function setDoctorSettings(name){
    //Doctor sees themselves in the little screen, the patient in the big screen. 
  }