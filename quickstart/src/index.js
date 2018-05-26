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
  identity = data.identity;
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

// Successfully connected!
function roomJoined(room) {
  window.room = activeRoom = room;

  log("Joined as '" + identity + "'");
  document.getElementById('button-join').style.display = 'none';
  document.getElementById('button-leave').style.display = 'inline';

  // Attach LocalParticipant's Tracks, if not already attached.
  var previewContainer1 = document.getElementById('local-div1');
  if (!previewContainer1.querySelector('video')) {
    attachParticipantTracks(room.localParticipant, previewContainer1);
  }

  var previewContainer2 = document.getElementById('local-div2');
  if (!previewContainer2.querySelector('video')) {
    attachParticipantTracks(room.localParticipant, previewContainer2);
  }


  // Attach the Tracks of the Room's Participants.
  room.participants.forEach(function(participant) {
    log("Already in Room: '" + participant.identity + "'");
    var previewContainer = document.getElementById('remote-media');
    attachParticipantTracks(participant, previewContainer);
  });

  // When a Participant joins the Room, log the event.
  room.on('participantConnected', function(participant) {
    log("Joining: '" + participant.identity + "'");
  });

  // When a Participant adds a Track, attach it to the DOM.
  room.on('trackAdded', function(track, participant) {
    log(participant.identity + " added track: " + track.kind);
    var previewContainer = document.getElementById('remote-media');
    attachTracks([track], previewContainer);
  });

  // When a Participant removes a Track, detach it from the DOM.
  room.on('trackRemoved', function(track, participant) {
    log(participant.identity + " removed track: " + track.kind);
    detachTracks([track]);
  });

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

function applyVideoInputDeviceSelection(deviceId, video) {
  return Video.createLocalVideoTrack({
    deviceId: deviceId,
    height: 240,
    width: 320
  }).then(function(localTrack) {
    localTrack.attach(video);
  });
}



// var currentStream;


// function stopMediaTracks(previewTracks) {
// previewTracks.getTracks().forEach(track => {
//    track.stop();
//  });
// }

// This is to populate the dropdown with items and devices that the camera has.
navigator.mediaDevices.enumerateDevices()
  .then(function(devices) {
    for(var i=0; i<devices.length; i++){
    // console.log("there are: " + devices.length + " devices!");

      if(devices[i].kind == "videoinput"){
        var device_id = devices[i].deviceId.toString();
        var device_label = devices[i].label.toString();
        $('#camera_selection').append($('<option>', {value: device_id, text: device_label }));
      }
    }
  })
  .catch(function(err) {
    console.log(err.name + ": " + err.message);
});



$("#switch-camera").click(function(){
  //Get the selected deviceID
  var yourSelect = document.getElementById( "camera_selection" );
  var theDeviceID =  yourSelect.options[ yourSelect.selectedIndex ].value;

  if (theDeviceID.toString()== "null"){
    alert("Please Select a Valid Video Device!");
  } 
  else{
  //Add the current Device ID to the localTrack

   //  var constraints = {
   //    video: {facingMode: {exact: 'environment'}},
   //    audio: false
   //  };

   // navigator.mediaDevices
   //  .getUserMedia(constraints)
   //  .then(stream => {
   //    currentStream = stream;
   //  })
   //  .catch(error => {
   //    console.error(error);
   //  });


  return Video.createLocalVideoTrack({
    video: { 
      deviceId: { exact: theDeviceID },
      facingMode: {exact: 'environment'}
    }
  }).then(function(localTrack) {
    // stopMediaTracks(currentStream);
    // console.log(activeRoom.localParticipant)
    activeRoom.localParticipant.addTrack(localTrack);
  });

  }
});

var stop = stream => stream.getTracks().forEach(track => track.stop());



  // navigator.mediaDevices.enumerateDevices()
  // .then(function(devices) {
  //   for(var i=0; i<devices.length; i++){
  //   // console.log("there are: " + devices.length + " devices!");
  //     if(devices[i].kind == "videoinput"){
  //       var device_id = devices[i].deviceId.toString();
  //       var device_label = devices[i].label.toString();
  //       // $('#camera_selection').append($('<option>', {value: device_id, text: device_label }));

  //        var yourSelect = document.getElementById( "camera_selection" );
  //        var theDeviceID =  yourSelect.options[ yourSelect.selectedIndex ].value;
  //     }
  //   }
  // })
  // .catch(function(err) {
  //   console.log(err.name + ": " + err.message);
  // });

 
//     // console.log("Video");
//     // alert("video");

//     // var constraints = {
//     //   video: {facingMode: {exact: 'environment'}}
//     // };

//     // var appliedPromise = MediaStreamTrack.applyConstraints(constraints);

//   //   navigator.mediaDevices.getUserMedia({ video: true }).then(mediaStream => {
//   //     const track = mediaStream.getVideoTracks()[0];
//   //     track.applyConstraints(constraints)
//   //   }).catch(function(err) {
//   // /* handle the error */
//   //   });

// });


