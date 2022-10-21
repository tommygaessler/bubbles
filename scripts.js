const VideoSDK = window.WebVideoSDK.default

let zmClient = VideoSDK.createClient()

let signatureEndpoint = 'https://videosdk-sample-signature.herokuapp.com'
let sessionName = 'bubbles2'
let sessionPasscode = 'test123'
let userName = 'Participant' + Math.floor(Math.random() * 100)
let role = 1

zmClient.init('US-en', 'CDN')

start()

// solve for if user closes app
// solve gallery view order for if user leaves

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

    } else {
      // document.getElementById('videoButton').disabled = false;
      document.getElementById('videoButton').style.display = 'block'
      document.getElementById('leaveButton').style.display = 'block'

      document.getElementById('loading').style.display = 'none'
    }

    console.log(zmClient.getCurrentUserInfo())
    console.log(zmClient.getSessionInfo())
  }).catch((error) => {
    console.log(error)
  })
}

function startVideo() {

  // Android Chrome and Edge self view not working
  // firefox 105 (testing for offscreen canvas) might also need this for android.
  if(!(typeof SharedArrayBuffer === 'function') && (typeof OffscreenCanvas === 'function')) {
    zmStream.startVideo({ videoElement: document.querySelector('#self-view-video') }).then(() => {
      console.log('hello')
      // zmStream.renderVideo(document.querySelector('#self-view-canvas'), zmClient.getCurrentUserInfo().userId, 355, 200, 0, 0, 2).then(() => {
        document.getElementById('videoButton').style.display = 'none'
        document.getElementById('self-view-wrapper').style.display = 'flex'
        // this was hiding on android so needed to show it
        // document.getElementById('self-view-video').style.display = 'none'
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

      // })
      // document.getElementById('videoButton').style.display = 'none'
      // document.getElementById('self-view-canvas').style.visibility = 'hidden'
    }).catch((error) => {
      console.log(error)
    })
  } else {
    // desktop edge, chrome, safari
    zmStream.startVideo({ mirrored: true }).then(() => {
      zmStream.renderVideo(document.querySelector('#self-view-canvas'), zmClient.getCurrentUserInfo().userId, 355, 200, 0, 0, 2).then(() => {
        document.getElementById('videoButton').style.display = 'none'
        document.getElementById('self-view-wrapper').style.display = 'flex'
        // this was hiding on android so needed to show it
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
      })
    }).catch((error) => {
      console.log(error)
    })
  }

  // if(!!window.chrome && (typeof SharedArrayBuffer === 'function')) {
    // zmStream.startVideo({ mirrored: true }).then(() => {
    //   zmStream.renderVideo(document.querySelector('#self-view-canvas'), zmClient.getCurrentUserInfo().userId, 355, 200, 0, 0, 2).then(() => {
    //     document.getElementById('videoButton').style.display = 'none'
    //     document.getElementById('self-view-video').style.visibility = 'hidden'
    //   })
    // }).catch((error) => {
    //   console.log(error)
    // })
  // } else {

  // firefox

  // }
}

function switchCamera(camera) {
  console.log(camera.value)
  zmStream.switchCamera(camera.value)
}

function leave() {
  document.getElementById('self-view-canvas').style.visibility = 'hidden'
  document.getElementById('self-view-video').style.visibility = 'hidden'
  document.getElementById('leaveButton').style.display = 'none'
  document.getElementById('thanks').style.display = 'flex'
  document.getElementById('self-view-wrapper').style.display = 'none'
  document.getElementById('videoButton').style.display = 'none'
  zmStream.stopRenderVideo(document.querySelector('#self-view-canvas'), zmClient.getCurrentUserInfo().userId).then(() => {
  })

  zmStream.stopVideo().then(() => {
    zmClient.leave()
  })
}

zmClient.on('peer-video-state-change', (payload) => {

  console.log('user video state change', zmClient.getAllUser())

  var interval

  function ifZmStream() {
    if(zmStream) {
      clearInterval(interval)

      if(payload.action === 'Start') {

        if(zmClient.getCurrentUserInfo().isHost) {
          renderVideos(payload.userId)
          document.getElementById('waitingText').style.display = 'none'
          document.getElementById('loading').style.display = 'none'
        }

      } else if(payload.action === 'Stop') {
        console.log('stopped video, remove user')
        zmStream.stopRenderVideo(document.querySelector('#zoom-canvas'), payload.userId).then(() => {
          document.getElementById(`bubble-${payload.userId}`).remove()
          if(zmClient.getAllUser().length < 2) {
            document.getElementById('waitingText').style.display = 'block'
            document.getElementById('loading').style.display = 'flex'
          }
        }).catch((error) => {
          console.log(error)
        })
      }
    }
  }

  interval = setInterval(ifZmStream, 1000)
})

// grid count
// x count
// y count
// ---
// x ++355
// y ++200

var xCord = 0
var yCord = 0
var yCord2 = 0
var yCord3 = 0
var yCord4 = 0
var yCord5 = 0

function renderVideos(userId) {
  if(zmClient.getAllUser().filter((user) => user.bVideoOn).length > 25) {
    // do nothing too many videos
  } else if (zmClient.getAllUser().filter((user) => user.bVideoOn).length > 20) {
    // 5 5
    console.log('column 5')
    zmStream.renderVideo(document.querySelector('#zoom-canvas'), userId, 355, 200, 1420, yCord5, 2).then(() => {
      // createBubble(userId, -1420, -(800-yCord5))
      createBubble(userId, -1420, -(800-yCord5))
      yCord5+=200
    })
  } else if(zmClient.getAllUser().filter((user) => user.bVideoOn).length > 15) {
    // 4 5
    console.log('column 4')
    zmStream.renderVideo(document.querySelector('#zoom-canvas'), userId, 355, 200, 1065, yCord4, 2).then(() => {
      // createBubble(userId, -1065, -(800-yCord4))
      createBubble(userId, -1498, -(800-yCord4))
      yCord4+=200
    })
  } else if(zmClient.getAllUser().filter((user) => user.bVideoOn).length > 10) {
    // 3 5
    console.log('column 3')
    zmStream.renderVideo(document.querySelector('#zoom-canvas'), userId, 355, 200, 710, yCord3, 2).then(() => {
      // createBubble(userId, -710, -(800-yCord3))
      createBubble(userId, -788, -(800-yCord3))
      yCord3+=200
    })
  } else if(zmClient.getAllUser().filter((user) => user.bVideoOn).length > 5) {
    // 2 5
    console.log('column 2')
    zmStream.renderVideo(document.querySelector('#zoom-canvas'), userId, 355, 200, 355, yCord2, 2).then(() => {
      // createBubble(userId, -355, -(800-yCord2))
      createBubble(userId, -433, -(800-yCord2))
      yCord2+=200
    })
  } else if(zmClient.getAllUser().filter((user) => user.bVideoOn).length >= 1) {
    // 1 5
    console.log('column 1')
    zmStream.renderVideo(document.querySelector('#zoom-canvas'), userId, 355, 200, xCord, yCord, 2).then(() => {
      // createBubble(userId, -100, -(800-yCord))
      createBubble(userId, -78, -(800-yCord))
      yCord+=200
    })
  }
}

zmClient.on('user-added', (payload) => {

  // if(zmClient.getAllUser().length < 3) {
  //   if(payload[0].userId !== zmClient.getCurrentUserInfo().userId) {
  //     document.querySelector('#participant-name').textContent = payload[0].displayName
  //   }
  // }
})

zmClient.on('user-removed', (payload) => {

  if(payload.length) {
    console.log(payload);
    // document.getElementById(`bubble-${payload[0].userId}`).remove()
    // document.getElementById(`bubble-${payload[0].userId}`).remove()
    // zmStream.stopRenderVideo(document.getElementById('#zoom-canvas'), payload[0].userId).then(() => {
    //
    // }).catch((error) => {
    //   console.log(error)
    // })
    if(zmClient.getAllUser().length < 2) {
      document.getElementById('waitingText').style.display = 'block'
      document.getElementById('loading').style.display = 'flex'
    }
  }
})

zmClient.off('user-added', (payload) => {

  // if(zmClient.getAllUser().length < 3) {
  //   if(payload[0].userId !== zmClient.getCurrentUserInfo().userId) {
  //     document.querySelector('#participant-name').textContent = payload[0].displayName
  //   }
  // }
})

zmClient.off('user-removed', (payload) => {
  // zmStream.stopRenderVideo(document.querySelector('#zoom-canvas'), payload[0].userId).then(() => {
  //
  //
  // })
})

function createBubble(userId, xCord, yCord) {
  var bubble = document.createElement('canvas')
  bubble.setAttribute('id', `bubble-${userId}`)
  bubble.setAttribute('class', 'circle')
  bubble.setAttribute('width', 200)
  bubble.setAttribute('height', 200)
  document.body.appendChild(bubble)
  var ctx = document.getElementById(`bubble-${userId}`).getContext('2d');
  var video = document.getElementById('zoom-canvas');

  // setTimeout(() => {
    // function crop() {
      console.log('cropped');
      (function loop() {
        // if (true) {
          // the cords will be dynamic. This whole function too, if someone leaves, break the loop
          ctx.drawImage(video, xCord, yCord);
          setTimeout(loop, 1000 / 30); // drawing at 30fps
        // }
      })();
      // ctx.drawImage(video, 0, 0);
    // }
  // }, 3000)

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
    window.requestAnimationFrame(animate);
  }

  window.requestAnimationFrame(animate);

}
