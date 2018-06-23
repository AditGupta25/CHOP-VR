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

    //Show the disease prevention notes on display here 
    displayPatientNotes();
    //-------------------------------------------------  

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

  try{
    var previewContainer1 = document.getElementById('local-div1');
    if (!previewContainer1.querySelector('video')) {
      attachParticipantTracks(activeRoom.localParticipant, previewContainer1);
    }else{
      previewContainer1.querySelector('video').remove();
      previewContainer1.querySelector('audio').remove();
      attachParticipantTracks(activeRoom.localParticipant, previewContainer1);
    }
  }catch(err){
    console.log("Error occured in Preview Container 1");
  }


  try{
    var previewContainer2 = document.getElementById('local-div2');
    if (!previewContainer2.querySelector('video')) {
      attachParticipantTracks(activeRoom.localParticipant, previewContainer2);
    }else{
      previewContainer2.querySelector('video').remove();
      previewContainer2.querySelector('audio').remove();
      attachParticipantTracks(activeRoom.localParticipant, previewContainer2);
    }
  }catch(err){
    console.log("Error occured in Preview Container 2");
  }


  // Attach the Tracks of the Room's Participants.
  room.participants.forEach(function(participant) {
    try{
        log("Already in Room: '" + participant.identity + "'");
        var remoteCameraContainer1 = document.getElementById('remote-media');
        if (!remoteCameraContainer1.querySelector('video')) {
        attachParticipantTracks(participant, remoteCameraContainer1);
        }else{
        remoteCameraContainer1.querySelector('video').remove();
        remoteCameraContainer1.querySelector('audio').remove();
        attachParticipantTracks(participant, remoteCameraContainer1);
    }
    }catch(err){
        console.log("Error occured trying attachParticipantTracks for remoteCameraContainer1");
    }
   });


  room.participants.forEach(function(participant) {
    try{
        log("Already in Room: '" + participant.identity + "'");
        var remoteCameraContainer2 = document.getElementById('remote-medi2');
        if (!remoteCameraContainer2.querySelector('video')) {
        attachParticipantTracks(participant, remoteCameraContainer2);
        }else{
        remoteCameraContainer2.querySelector('video').remove();
        remoteCameraContainer2.querySelector('audio').remove();
        attachParticipantTracks(participant, remoteCameraContainer2);
        }
    }catch(err){
          console.log("Error occured trying attachParticipantTracks for remoteCameraContainer2");
    }
  });

  // When a Participant joins the Room, log the event.
  room.on('participantConnected', function(participant) {
    log("Joining: '" + participant.identity + "'");
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
    try{
      log(room.localParticipant.identity + " added track: " + track.kind);
      var previewContainer1 = document.getElementById('local-div1');
      attachTracks([track], previewContainer1);
    }catch(err){
      console.log("Error occured trying attach for previewContainer1");
    }
  })

  room.localParticipant.on('trackAdded', function(track) {
    try{
      log(room.localParticipant.identity + " added track: " + track.kind);
      var previewContainer2 = document.getElementById('local-div2');
      attachTracks([track], previewContainer2);
    }catch(err){
      console.log("Error occured trying attach for previewContainer2");
    }
    
  })


  // When a Participant adds a Track, attach it to the DOM.
  room.on('trackAdded', function(track, participant) {
    try{
      log(participant.identity + " added track: " + track.kind);
      var remoteCameraContainer1 = document.getElementById('remote-media');
      attachTracks([track], remoteCameraContainer1);
    }catch(err){
      console.log("Error occured trying attach for remoteCameraContainer1");
    }
  });

  room.on('trackAdded', function(track, participant) {
    try{
      log(participant.identity + " added track: " + track.kind);
      var remoteCameraContainer2 = document.getElementById('remote-media2');
      attachTracks([track], remoteCameraContainer2);
    }catch(err){
      console.log("Error occured trying attach for remoteCameraContainer2");
    }
    
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

            $("#problemSelection").show();

            // console.log(identity);
            $(this).prop('disabled', true);
            setPatientSettings();
          } 

        }else{
          //false indicates Doctor 
          identity = $('#userName').val().toString();
          if(identity == ''){
            alert("Please Enter a Name!")
          }else{
            $("#overlay").hide();
            // console.log(identity);
            $(this).prop('disabled', true);
            setDoctorSettings();
          } 
        }
      });
    });

  function setPatientSettings(){
    //Patient sees themselves in the big screen, and the doctor in the little screen
    //local-div1 and local-div2 should have what the patient sees, and the remote-div should have what the user recieves
    console.log('user selected patient');
  }

  function setDoctorSettings(){
    //Doctor sees themselves in the little screen, the patient in the big screen. 
    console.log('user selected doctor');

    document.getElementById("remote-media").setAttribute("id", "local-div1");
    document.getElementById("local-div1").setAttribute("id", "remote-media");
    document.getElementById("local-div2").setAttribute("id", "remote-media2");
  }



  var isSmallScreen = "true";

  $(function() {
    $('#screenSize').change(function() {
      currentToggle = '' + $(this).prop('checked');
    })
  });


  $(function() {
    $( "#setScreenSize" ).click(function() {
        //Disable button for click

        if(isSmallScreen == "true"){
          //This is a small screen and nothing changes, we can do VR! 
          alert("Sorry, this feature does not work yet!");

        }else{
          //This is a big screen, and I do not think we can do VR :(
          alert("Sorry, this feature does not work yet!");
        }
    });
  });


  function displayPatientNotes(){
    var textElement =  document.getElementById("textArea"); 

     textElement.value = "Patient Notes:";
     textElement.value += "\n----------------";


     if(document.getElementById("checkbox1").checked == true){
        textElement.value += "\n Omphalocele Checklist Items:";
        textElement.value += "\n - Check Wound";
        textElement.value += "\n - Demo Dressing Change";
     }

     if(document.getElementById("checkbox2").checked == true){
        textElement.value += "\n\n G-Tube Checklist Items:";
        textElement.value += "\n - Got Adequate supplies?";
        textElement.value += "\n - Demo attachment to resevoir";     
     }  

     if(document.getElementById("checkbox3").checked == true){
        textElement.value += "\n\n Respiratory Support Checklist Items:";
        textElement.value += "\n - Confirm correct settings";
        textElement.value += "\n - Call 18003452345 for support";

     }
    var patientNotes = "test";
  }




  $(function() {
    $( "#doctor-quickstart" ).click(function() {
       
       setPatientSettings();

       //enter room called test
       
       $("#userName").val("Doctor");
       $( "#submitButton" ).trigger( "click" );

       $("#room-name").val("test");
       $( "#button-join" ).trigger( "click" );
    });
  });

  $(function() {
    $( "#patient-quickstart" ).click(function() {
       
       setDoctorSettings();

      //enter room called test
      $("#userName").val("Patient");
      $( "#submitButton" ).trigger( "click" );

      $("#room-name").val("test");
      $( "#button-join" ).trigger( "click" );
    });
  });


