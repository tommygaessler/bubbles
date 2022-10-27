const VideoSDK = window.WebVideoSDK.default

let zmClient = VideoSDK.createClient()

let signatureEndpoint = 'https://videosdk-sample-signature.herokuapp.com'
let sessionName = 'apiworld'
let sessionPasscode = 'test123'
let userName = 'Participant' + Math.floor(Math.random() * 100)
let role = 1

zmClient.init('US-en', 'CDN')

var videoArr = []
var openSpots = []

// videoArr is collection of userIds that are being rendered
// openSpots is collection of indexs that a video can be rendered on

start()

function start() {

  fetch(signatureEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionName: sessionName,
      role: role
    })
  }).then((response) => {
    return response.json()
  }).then((data) => {
    joinSession(data.signature)
  }).catch((error) => {
  	console.log(error)
  })
}

function joinSession(signature) {
  zmClient.join(sessionName, signature, userName, sessionPasscode).then((data) => {

    zmStream = zmClient.getMediaStream()

    if(zmClient.getCurrentUserInfo().isHost) {

      document.getElementById('loadingText').style.display = 'none'
      document.getElementById('waitingText').style.display = 'block'
      document.getElementById('join-iframe').style.display = 'block'

    } else {
      document.getElementById('videoButton').style.display = 'block'
      document.getElementById('leaveButton').style.display = 'block'

      document.getElementById('loading').style.display = 'none'
    }
  }).catch((error) => {
    console.log(error)
  })
}

function startVideo() {
  if(!(typeof SharedArrayBuffer === 'function') && (typeof OffscreenCanvas === 'function')) {
    zmStream.startVideo({ videoElement: document.querySelector('#self-view-video') }).then(() => {
      document.getElementById('videoButton').style.display = 'none'
      document.getElementById('self-view-wrapper').style.display = 'flex'
      document.getElementById('self-view-canvas').style.display = 'none'

      let cameras = zmStream.getCameraList()
        console.log(cameras)
        let select = document.getElementById('switch');

        if(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {

          let opt1 = document.createElement('option');
          opt1.value = 'user';
          opt1.innerHTML = 'Front Camera';
          select.appendChild(opt1);

          let opt2 = document.createElement('option');
          opt2.value = 'environment';
          opt2.innerHTML = 'Back Camera';
          select.appendChild(opt2);

        } else {
          cameras.forEach((camera) => {
            let opt = document.createElement('option');
            opt.value = camera.deviceId;
            opt.innerHTML = camera.label;
            select.appendChild(opt);
          })
        }
    }).catch((error) => {
      console.log(error)
    })
  } else {
    // desktop edge, chrome, safari
    zmStream.startVideo({ mirrored: true }).then(() => {
      zmStream.renderVideo(document.querySelector('#self-view-canvas'), zmClient.getCurrentUserInfo().userId, 355, 200, 0, 0, 2).then(() => {
        document.getElementById('videoButton').style.display = 'none'
        document.getElementById('self-view-wrapper').style.display = 'flex'
        document.getElementById('self-view-video').style.display = 'none'

        let cameras = zmStream.getCameraList()
        console.log(cameras)
        let select = document.getElementById('switch');

        if(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {

          let opt1 = document.createElement('option');
          opt1.value = 'user';
          opt1.innerHTML = 'Front Camera';
          select.appendChild(opt1);

          let opt2 = document.createElement('option');
          opt2.value = 'environment';
          opt2.innerHTML = 'Back Camera';
          select.appendChild(opt2);

        } else {
          cameras.forEach((camera) => {
            let opt = document.createElement('option');
            opt.value = camera.deviceId;
            opt.innerHTML = camera.label;
            select.appendChild(opt);
          })
        }
      }).catch((error) => {
        console.log(error)
      })
    }).catch((error) => {
      console.log(error)
    })
  }
}

function switchCamera(camera) {
  zmStream.switchCamera(camera.value)
}

zmClient.on('peer-video-state-change', (payload) => {

  console.log(payload)
  console.log('user video state change', zmClient.getAllUser())

  if(payload.action === 'Start') {

    if(zmClient.getCurrentUserInfo().isHost && zmClient.getAllUser().filter((user) => user.bVideoOn).length < 26) {
      renderVideo(payload.userId)
      document.getElementById('waitingText').style.display = 'none'
      document.getElementById('loading').style.display = 'none'
    }

  } else if(payload.action === 'Stop') {

    let userVideoState = zmClient.getAllUser().filter((user) => {
      return user.userId === payload.userId
    })[0]

    console.log(userVideoState)
    console.log('videoArr Off', videoArr)

    if(!userVideoState || userVideoState.bVideoOn) {
      zmStream.stopRenderVideo(document.querySelector('#zoom-canvas'), payload.userId).then(() => {
        console.log(payload.userId)
        console.log(videoArr.indexOf(payload.userId))
        openSpots.push(videoArr.indexOf(payload.userId))
        videoArr.splice(videoArr.indexOf(payload.userId), 1)

        // remove bubble
        removeBubble(payload.userId)
        if(zmClient.getAllUser().length < 2) {
          document.getElementById('waitingText').style.display = 'block'
          document.getElementById('loading').style.display = 'flex'
        }
      }).catch((error) => {
        console.log(error)
      })
    }
  }

})

// handle if there are more than 25 in the session with video on and if someone leaves, put the next person in?

function renderVideo(user) {

  if(openSpots.length) {
    zmStream.renderVideo(document.querySelector('#zoom-canvas'), user, 355, 200, (355*openSpots[0]), 0, 2).then(() => {
      // make bubble
      // makeBubble(user, 200, (355*openSpots[0]))
      videoArr.splice(openSpots[0], 0, user)
      // makeBubble(user, -(78+(355*openSpots[0]-355)), 0)
      makeBubble(user, -(78+(355*openSpots[0])), 0)
      openSpots.shift()
    }).catch((error) => {
      console.log(error)
    })
  } else {
    videoArr.push(user)
    zmStream.renderVideo(document.querySelector('#zoom-canvas'), user, 355, 200, (355*videoArr.length-355), 0, 2).then(() => {
      // make bubble
      makeBubble(user, -(78+(355*videoArr.length-355)), 0)
    }).catch((error) => {
      console.log(error)
    })
  }
  console.log('Video Array', videoArr)
  console.log('Open Spots', openSpots)

}

var bubblesObject = {}

function makeBubble(userId, xCord, yCord) {

  var bubble = document.createElement('canvas')
  bubble.setAttribute('id', `bubble-${userId}`)
  bubble.setAttribute('class', 'circle')
  bubble.setAttribute('width', 200)
  bubble.setAttribute('height', 200)
  document.body.appendChild(bubble)
  var ctx = document.getElementById(`bubble-${userId}`).getContext('2d');
  var video = document.getElementById('zoom-canvas');

  (function loop() {
    if (videoArr.indexOf(userId) !== -1) {
      ctx.drawImage(video, xCord, yCord);
      setTimeout(loop, 1000 / 30);
    } else {
      console.log('stopped copying')
    }
  })();

  let x = 0,
    y = 0,
    dirX = 1,
    dirY = 1;
  const speed = 2;

  const pallete = ["#7C33F3", "#F700BA", "#FF287F", "#FF8152", "#FFC246", "#F9F871"];
  let dvd = document.getElementById(`bubble-${userId}`);
  let prevColorChoiceIndex = 0;
  const dvdWidth = dvd.clientWidth+20;
  const dvdHeight = dvd.clientHeight+20;

  function getNewRandomColor() {
    const currentPallete = [...pallete]
    currentPallete.splice(prevColorChoiceIndex,1)
    const colorChoiceIndex = Math.floor(Math.random() * currentPallete.length);
    prevColorChoiceIndex = colorChoiceIndex<prevColorChoiceIndex?colorChoiceIndex:colorChoiceIndex+1;
    const colorChoice = currentPallete[colorChoiceIndex];
    return colorChoice;
  }

  function animate() {
    const screenHeight = document.body.clientHeight;
    const screenWidth = document.body.clientWidth;

    if (y + dvdHeight >= screenHeight || y < 0) {
      dirY *= -1;
      dvd.style.borderColor = getNewRandomColor();
      // dvd.style.backgroundColor = getNewRandomColor();
    }
    if (x + dvdWidth >= screenWidth || x < 0) {
      dirX *= -1;

      dvd.style.borderColor = getNewRandomColor();
      // dvd.style.backgroundColor = getNewRandomColor();
    }
    x += dirX * speed;
    y += dirY * speed;
    dvd.style.left = x + "px";
    dvd.style.top = y + "px";
    bubblesObject[userId].inner = window.requestAnimationFrame(animate)
  }

  bubblesObject[userId] = {
    outer: window.requestAnimationFrame(animate)
  }
}

function removeBubble(userId) {
  document.getElementById(`bubble-${userId}`).remove()
  cancelAnimationFrame(bubblesObject[userId].inner)
  cancelAnimationFrame(bubblesObject[userId].outer)
  delete bubblesObject[userId]
}

function leave() {

  document.getElementById('self-view-canvas').style.visibility = 'hidden'
  document.getElementById('self-view-video').style.visibility = 'hidden'
  document.getElementById('leaveButton').style.display = 'none'
  document.getElementById('thanks').style.display = 'flex'
  document.getElementById('self-view-wrapper').style.display = 'none'
  document.getElementById('videoButton').style.display = 'none'

  zmClient.leave()
}

zmClient.on('user-removed', (payload) => {
  console.log('user left', payload)
})
