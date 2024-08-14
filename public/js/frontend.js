const canvas = document.getElementById('mainCanvas')
const c = canvas.getContext('2d')
const bCanvas = document.getElementById('bgCanvas');
const scale = window.devicePixelRatio
bCanvas.width = Math.floor(4096/scale)
bCanvas.height = Math.floor(3092 / scale)
const distanceFromBg = 350

//console.log(scale)
//c.scale(1 / scale, 1 / scale)
canvas.width = 1250
canvas.height = canvas.width * 9 / 16

let gl, program, positionBuffer, texCoordBuffer, positionLocation, texture;
let texcoordLocation;
let bAngle = 0;
const panRadius = 0.186;
function initializeWebGL(image) {
  
  gl = bCanvas.getContext('webgl2');
  //gl.scale(1 / window.devicePixelRatio, 1 / window.devicePixelRatio)
  gl.viewport(0, 0, bCanvas.width, bCanvas.height);
  if (!gl) {
    console.error('WebGL not supported');
    return;
  }  

  const vertexShaderSource = `
        attribute vec4 a_position;
        attribute vec2 a_texcoord;
        varying vec2 v_texcoord;
        void main() {
          gl_Position = a_position;
          v_texcoord = a_texcoord;
        }
      `;
  const fragmentShaderSource = `
        precision mediump float;
        varying vec2 v_texcoord;
        uniform sampler2D u_texture;
        void main() {
          gl_FragColor = texture2D(u_texture, v_texcoord);
        }
      `;

  function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

  program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);  

  // Create and set up position buffer
  positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); 
  const positions = [
    -1, -1,  // bottom-left
    1, -1,  // bottom-right
    -1, 1,  // top-left
    1, 1   // top-right
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
 
  positionLocation = gl.getAttribLocation(program, 'a_position');
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLocation);  
  

  // Create and set up texture coordinate buffer
  texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  const texcoords = [
    0, 1,
    1, 1,
    0, 0,
    1, 0
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);

  texcoordLocation = gl.getAttribLocation(program, 'a_texcoord');
  //gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(texcoordLocation);


  // Create and configure texture
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);

  // Texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  
  return true;

}
function startAnimation() {
  if (gl) {
    animate();
  } else {
    console.error('WebGL not initialized yet')
  }
}

function drawBackground() {
  gl.useProgram(program);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

let textureY = (Math.random() * canvas.width*0.9 + canvas.width*0.05)/canvas.width / distanceFromBg;
let textureX = (Math.random() * canvas.height * 0.9 + canvas.height * 0.05) / canvas.height / distanceFromBg;
let bgX;
let bgY;

function updateTextureCoordinates() {
  bgX = Math.cos(bAngle) * panRadius
  bgY = Math.sin(bAngle) * panRadius
  if (FENDPLAYERS[SOCKET.id]) {
    const player = FENDPLAYERS[SOCKET.id];


    // Normalize player coordinates to texture space
    textureX = player.x / canvas.width / distanceFromBg;
    textureY = player.y / canvas.height / distanceFromBg;
  }
    // Calculate the offset
  bgX += textureX; // Center the texture around the player
  bgY += textureY; // Center the texture around the player
  
  const texcoords = [
    0 + bgX, 1 + bgY,  // bottom-left
    1 + bgX, 1 + bgY,  // bottom-right
    0 + bgX, 0 + bgY,  // top-left
    1 + bgX, 0 + bgY,  // top-right
  ];

  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);
}

let glInitialized = false;

// Load and use bgImage
const bgImage = new Image();
bgImage.src = "../img/bbg3.png";
bgImage.onload = () => {
  glInitialized = initializeWebGL(bgImage);
  if (glInitialized) {
    startAnimation()
  } else {
    console.error('Failed to initialize WebGL')
  
  }
};

const scoreEl = document.querySelector('#scoreEl')

window.canvasDiag = Math.hypot(canvas.width,canvas.height)

const SOCKET = io()
let thisPlayer;
const X = canvas.width / 2
const Y = canvas.height / 2
const ACTIVE_SPRITES = {};
let actSprID = 0;
const RESPAWNTIME = 5
const PLAYER_RADIUS = 11
const FENDPLAYERS = {}
const FENDPROJECTILES = {}
const FENDPARTICLES = {}
const MOUSEPOSITION = {x:0,y:0}
const ENERGYCOSTS = {shoot:8,move:0.01}
let PLAYERSPEED = { x: 0, y: 0 }
const PROJ_SPEED = 30
const TOPSPEED = 7.04
const dV = Number((TOPSPEED / 32).toPrecision(2))
const PLAYERINPUTS = []
const MOVESOUND = {}
const KEYS = {
  w: {
    pressed: false
  },
  a: {
    pressed: false
  },
  s: {
    pressed: false
  },
  d: {
    pressed: false
  },
  lastXKey: 'e',
  lastYKey: 'q'
}

Howler.mute(true)

const calcAimData = () => {
  if (!FENDPLAYERS[SOCKET.id]) return
  const { top, left } = canvas.getBoundingClientRect()
  playerPosition = {
    x: FENDPLAYERS[SOCKET.id].x,
    y: FENDPLAYERS[SOCKET.id].y
  }
  angle = Math.atan2(
    MOUSEPOSITION.y - top - playerPosition.y,
    MOUSEPOSITION.x - left - playerPosition.x
  )
  angle = (angle + 2 * Math.PI) % (2 * Math.PI)
  FENDPLAYERS[SOCKET.id].angleCos = Math.cos(angle)
  FENDPLAYERS[SOCKET.id].angleSin = Math.sin(angle)
  FENDPLAYERS[SOCKET.id].aimAngle = angle
  SOCKET.emit('updateCannonPosition', ({
    angleCos: FENDPLAYERS[SOCKET.id].angleCos,
    angleSin: FENDPLAYERS[SOCKET.id].angleSin,
    angle: FENDPLAYERS[SOCKET.id].aimAngle,
    cannonRadius: FENDPLAYERS[SOCKET.id].cannonRadius
  }))
}

let sequenceNumber = 0
let decel = { x: false, y: false }
let randomI = 0;
let energyRepBuffer;
let holdFireButton = false
let stuck = false
let stuckTimeout;

function check2Big(num) {
  if (num == Number.MAX_SAFE_INTEGER) {
    return 0
  }
  else {    
    return num+1
    
  }
}


SOCKET.on('updateProjectiles', ({ backEndProjectiles, rand1, rand2, side, id }) => {
  
    const backEndProjectile = backEndProjectiles[id]
    if (!FENDPROJECTILES[id]) {
      FENDPROJECTILES[id] = new Projectile({
        id,
        x: backEndProjectile.x,
        y: backEndProjectile.y,
        speed: PROJ_SPEED,
        willHit: backEndProjectile.willHit,
        radius: backEndProjectiles[id].radius,
        craft: FENDPLAYERS[backEndProjectile.playerId]?.craft,
        velocity: backEndProjectile.velocity,
        angle: backEndProjectile.angle
      })
      sounds.weapons[Math.round(rand1 * (sounds.weapons.length - 1))].play()
    } else {
      FENDPROJECTILES[id].angle = backEndProjectile.angle
      FENDPROJECTILES[id].x = backEndProjectile.x
      FENDPROJECTILES[id].y = backEndProjectile.y
      FENDPROJECTILES[id].velocity = backEndProjectile.velocity
      FENDPROJECTILES[id].hasRicocheted = backEndProjectile.hasRicocheted
      FENDPROJECTILES[id].ricochetPens = backEndProjectile.ricochetPens
      if (FENDPROJECTILES[id].hasRicocheted) sounds.barrierHits[Math.round(rand1 * (sounds.barrierHits.length - 1))].play()

      let spriteX = FENDPROJECTILES[id].x + (rand1 - 0.5) * 8, spriteY = FENDPROJECTILES[id].y + (rand2 - 0.5) * 8;
      
      switch (side) {
        case 'top': spriteY = 0; spriteX = FENDPROJECTILES[id].x; break
        case 'bottom': spriteY = canvas.height; spriteX = FENDPROJECTILES[id].x; break
        case 'left': spriteX = 0; spriteY = FENDPROJECTILES[id].y; break
        case 'right': spriteX = canvas.width; spriteY = FENDPROJECTILES[id].y; break
      }
      if (backEndProjectile.isDead) {        
        actSprID = check2Big(actSprID)
        sprToPush = smlHitSprite.clone()
        sprToPush.resetSprite(spriteX, spriteY, rand1 * 2 * Math.PI)
        sprToPush.image = hitImages[backEndProjectile.craft.hitType]
        ACTIVE_SPRITES[actSprID] = sprToPush        
        delete FENDPROJECTILES[id]
        }
      else if(side){        
        actSprID = check2Big(actSprID)
        sprToPush = impSprite.clone()
        sprToPush.resetSprite(spriteX, spriteY, rand1*2*Math.PI)
        ACTIVE_SPRITES[actSprID] = sprToPush
        
      }
      
    }
  
  
})

SOCKET.on('playerHitBarrier', () => {
  if(!sounds.ouch.playing())
    sounds.ouch.play()
  FENDPLAYERS[SOCKET.id].energy *=0.995

})

SOCKET.on('getNewAngle', (newBAngle) => {
  bAngle = newBAngle
})
SOCKET.on('decelerating', ({ DecelX, DecelY }) => {
  if (DecelX !== undefined) decel.x = DecelX;
  if (DecelY !== undefined) decel.y = DecelY;

  logSpeed()
})

async function logSpeed() {
  while (decel.x && decel.y) {
    await new Promise(resolve => setTimeout(resolve, 15));
  }
}
SOCKET.on('updateThruster', ({Thruster, id}) => {
  if (Thruster < 0.2) Thruster = 0
  FENDPLAYERS[id].thrusterOutput = Thruster
})
SOCKET.on('updateSpeed', ({newSpeed, id}) => {  
  if (SOCKET.id === id) {
    PLAYERSPEED = newSpeed
  }
  else {
    FENDPLAYERS[id].thrusterOutput = Math.hypot(newSpeed.x, newSpeed.y)
  }
  
})

SOCKET.on('updateText', ({text, playerId}) => {
  FENDPLAYERS[playerId].text = text
})

SOCKET.on('updatePlayers', (backEndPlayers) => {
  // Adding a new player... 
  
  for (const id in backEndPlayers) {
        const backEndPlayer = backEndPlayers[id]

    if (!FENDPLAYERS[id]) {
      FENDPLAYERS[id] = new Player({
        x: backEndPlayer.x,
        y: backEndPlayer.y,
        bAngle,
        craft: backEndPlayer.craft,
        onMap: backEndPlayer.onMap,
        username: backEndPlayer.username,
        isDead: false,
        socket: SOCKET,
        ip: backEndPlayer.ip,
        isRespawning: false,
        radius: PLAYER_RADIUS,
        opacity: 1,
        text: backEndPlayer.username,
        rand: backEndPlayer.rand
      })
      if (id === SOCKET.id) thisPlayer = FENDPLAYERS[id]
      if (!FENDPLAYERS[id].onMap) {
        actSprID = check2Big(actSprID)
        const sprToPush = vrtxSprite.clone()
        sprToPush.resetSprite(backEndPlayer.x, backEndPlayer.y)
        ACTIVE_SPRITES[actSprID] = sprToPush
        //vrtxSprite.resetSprite(backEndPlayer.x,backEndPlayer.y)
        //ACTIVE_SPRITES[actSprID] = vrtxSprite
        sounds.vortex.play()
        SOCKET.emit('onMap')
      }
      const playerLabels = document.querySelector('#playerLabels')
      playerLabels.innerHTML += `<div data-id="${id}" class="stick-no-bills-big" data-score="${backEndPlayer.score}">${backEndPlayer.username}: <span id="${backEndPlayer.username}ScoreEl" style="text-align: right; color: ${backEndPlayers[id].craft.mColor} !important;">${backEndPlayer.score}</span></div>`
    } else {
      document.querySelector(`div[data-id="${id}"]`).innerHTML = `${backEndPlayer.username}: <span id="${backEndPlayer.username}ScoreEl" style="text-align: right; color: ${backEndPlayers[id].craft.mColor} !important;">${backEndPlayer.score}</span>`
      document.querySelector(`div[data-id="${id}"]`).setAttribute('data-score', backEndPlayer.score)
      // Handling score labels and usernames
      const parentDiv = document.querySelector('#playerLabels')
      const childDivs = Array.from(parentDiv.querySelectorAll('div'))

      childDivs.sort((a, b) => {
        const scoreA = Number(a.getAttribute('data-score'))
        const scoreB = Number(b.getAttribute('data-score'))
        return scoreB - scoreA
      })

      childDivs.forEach(div => {
        parentDiv.removeChild(div)
      })

      childDivs.forEach(div => {
        parentDiv.appendChild(div)
      })
      FENDPLAYERS[id].onMap = true
      FENDPLAYERS[id].target = {
        x: backEndPlayer.x,
        y: backEndPlayer.y
      }
      
      
        if (id === SOCKET.id) {
          if (FENDPLAYERS[SOCKET.id].isDead)
            sounds.noShield.stop(alarm[SOCKET.id])          
          const lastBackendInputIndex = PLAYERINPUTS.findIndex(input => {            
            return backEndPlayer.sequenceNumber === input.sequenceNumber
          })
          if (lastBackendInputIndex > -1) PLAYERINPUTS.splice(0, lastBackendInputIndex + 1)

          PLAYERINPUTS.forEach((input) => {
            FENDPLAYERS[id].target.x += input.dx
            FENDPLAYERS[id].target.y += input.dy
          })
        }
        else {  // Update properties for all other players
          FENDPLAYERS[id].cannonRadius = backEndPlayer.cannonRadius
          FENDPLAYERS[id].angleCos = backEndPlayer.angleCos
          FENDPLAYERS[id].angleSin = backEndPlayer.angleSin
          FENDPLAYERS[id].energy = backEndPlayer.energy
          FENDPLAYERS[id].aimAngle = backEndPlayer.aimAngle
          FENDPLAYERS[id].moveAngle = backEndPlayer.moveAngle
          FENDPLAYERS[id].x = backEndPlayer.x
          FENDPLAYERS[id].y = backEndPlayer.y
        }
      }
  }
    
    // Delete front end players when they disconnect
    for (const id in FENDPLAYERS) {
      if (!backEndPlayers[id]) {
        const divToDelete = document.querySelector(`div[data-id="${id}"]`)
        playerLabels.removeChild(divToDelete)
        if (id === SOCKET.id) {
          document.querySelector('#usernameForm').style.display = 'block'
        }
            delete FENDPLAYERS[id]
      }
    }
})

SOCKET.on('updateShieldInt', ({shield, playerId, isReplenishing }) => {
  if (shield > 100) FENDPLAYERS[playerId].shield = 100
  else FENDPLAYERS[playerId].shield = shield  
  FENDPLAYERS[playerId].shieldReplenish = isReplenishing  
})

SOCKET.on('updateParticles', ({ backEndParticles, randomI = -1 }) => {
  if (randomI >= 0) {
    sounds.barrierHits[Math.round(randomI * (sounds.barrierHits.length - 1))].play()
  }
  for(particle in backEndParticles) {
    id = backEndParticles[particle].particleId
    if (FENDPARTICLES[id]) continue
    FENDPARTICLES[id] = new Particle({
      x: backEndParticles[id].x,
      y: backEndParticles[id].y,
      radius: backEndParticles[id].radius,
      velocity: backEndParticles[id].velocity,
      color: backEndParticles[id].color,
      alpha: 1
    })
  }
  
})

let alarm = {}

SOCKET.on('playerHit', ({ rand1, rand2, playerId, id: projId, shooterId }) => {
  sounds.barrierHits[Math.round(rand1 * (sounds.barrierHits.length - 1))].play()
  sounds.shieldHit[Math.round(rand2 * (sounds.shieldHit.length - 1))].play()
  FENDPLAYERS[playerId].shield -= FENDPROJECTILES[projId].damage  
  let textToShow
  let jitterAmount = 8; // Range of jitter in pixels
  let jitterDuration = 0.05; // Duration of each jitter step in seconds
  let fadeOutDuration = 0.5; // Duration of fade-out in seconds
  if (FENDPLAYERS[playerId].shield <= 0) {                                          // play dead shield sound when it drops to 0%
    FENDPLAYERS[playerId].shield = 0
    textToShow = 'Critical HIT' 
    sounds.playerHitBarr.play('shieldDead')
    jitterAmount = 5
    jitterDuration = 0.2
    fadeOutDuration = 1
  } else textToShow = -FENDPROJECTILES[projId].damage

  let hittingProj = FENDPROJECTILES[projId]
  hittingProj.x = FENDPLAYERS[playerId].x +
    ((rand1 * 2 * FENDPLAYERS[playerId].radius) - FENDPLAYERS[playerId].radius)
  hittingProj.y = FENDPLAYERS[playerId].y +
    ((rand2 * 2 * FENDPLAYERS[playerId].radius) - FENDPLAYERS[playerId].radius)
  
//  ACTIVE_SPRITES.push(new Sprite(smallHit, hittingProj.x, hittingProj.y, 60, 1, false, 516, 463, 7, 9, 89, 80))

  if (playerId === SOCKET.id || shooterId === SOCKET.id) {      

    // Create a GSAP timeline
    const tl = gsap.timeline({
      onUpdate: () => {c.save()
        hittingProj.drawHitSprite(textToShow)
        c.restore()
      } // Redraw the text on every update
    });

    // Add jitter effect to the timeline
      tl.to(hittingProj, {
        x: `+=${rand1 * jitterAmount - jitterAmount / 2}`,
        y: `+=${rand2 * jitterAmount - jitterAmount / 2}`,
        duration: jitterDuration,
        ease: 'none',
        repeat: -1, // Infinite repeat for jitter
        yoyo: true // To make jitter effect oscillate
      });
    //}

    // Add fade-out effect to the timeline
    tl.to(hittingProj, {
      opacity: 0,
      duration: fadeOutDuration,
      ease: 'power1.inOut',
      onComplete: () => {
        tl.kill(); // Stop the timeline after fade-out
      }
    });

    // Start the timeline
      tl.play();
  }
  if (SOCKET.id == shooterId) {
    FENDPLAYERS[shooterId].energy += (1 - FENDPROJECTILES[projId].distanceRatio) * 0.8 * ENERGYCOSTS.shoot
  }
  if (SOCKET.id == playerId) {
  SOCKET.emit('updateShield', ({ shield: FENDPLAYERS[playerId].shield, playerId, isReplenishing: null }))
  clearTimeout(FENDPLAYERS[playerId].replenishBuffer)
  clearInterval(FENDPLAYERS[playerId].shieldReplenish)
  FENDPLAYERS[playerId].shieldReplenish = null
  FENDPLAYERS[playerId].replenishBuffer = null
    FENDPLAYERS[playerId].replenishBuffer = setTimeout(() => {
      sounds.shieldUp.play()
      FENDPLAYERS[playerId].shieldReplenish = setInterval(() => {
        if (FENDPLAYERS[playerId].shield > 20) sounds.noShield.pause(alarm[playerId])
        FENDPLAYERS[playerId].replenishShield()
        SOCKET.emit('updateShield', ({ shield: FENDPLAYERS[playerId].shield, playerId, isReplenishing: FENDPLAYERS[playerId].shieldReplenish }))        

      }, 12)
    }, 4200)
    if (FENDPLAYERS[playerId].shield <= 15 && !sounds.noShield.playing(alarm[playerId]))
      alarm[playerId] = sounds.noShield.play()
  }
}) 

SOCKET.on('playerDies', ({ dyingPlayerId, rand1 }) => {

  if (FENDPLAYERS[dyingPlayerId]) {
    actSprID = check2Big(actSprID)
    sprToPush = explSprite.clone()
    sprToPush.resetSprite(FENDPLAYERS[dyingPlayerId].x, FENDPLAYERS[dyingPlayerId].y,rand1*2*Math.PI)
    ACTIVE_SPRITES[actSprID] = sprToPush        
    FENDPLAYERS[dyingPlayerId].isDead = true
    dyingPlayer = FENDPLAYERS[dyingPlayerId]
    sounds.die.play()    

    if (dyingPlayerId === SOCKET.id) {
      clearTimeout(energyRepBuffer)
      sounds.move.stop(MOVESOUND[SOCKET.id])
      document.getElementById("stats").style.display = 'inline'
      clearInterval(FENDPLAYERS[dyingPlayerId].shieldReplenish)
      FENDPLAYERS[dyingPlayerId].shieldReplenish = null
      clearTimeout(FENDPLAYERS[dyingPlayerId].replenishBuffer)
      FENDPLAYERS[dyingPlayerId].replenishBuffer = null
    }

    setTimeout(() => {
      sounds.respawned.play()
      FENDPLAYERS[dyingPlayerId].opacity = 1
      document.getElementById("stats").style.display = 'none'
      FENDPLAYERS[dyingPlayerId].energy = 0
      FENDPLAYERS[dyingPlayerId].isRespawning = true
      FENDPLAYERS[dyingPlayerId].isDead = false
      FENDPLAYERS[dyingPlayerId].text = FENDPLAYERS[dyingPlayerId].username
      actSprID = check2Big(actSprID)
      sprToPush = vrtxSprite.clone()
      sprToPush.resetSprite(FENDPLAYERS[dyingPlayerId].x, FENDPLAYERS[dyingPlayerId].y)
      ACTIVE_SPRITES[actSprID] = sprToPush
      sounds.vortex.play()
      if (dyingPlayerId === SOCKET.id) {
      FENDPLAYERS[dyingPlayerId].shield = 30
      FENDPLAYERS[dyingPlayerId].shieldReplenish = setInterval(() => {
        FENDPLAYERS[dyingPlayerId].replenishShield()
         SOCKET.emit('updateShield',
          ({ shield: FENDPLAYERS[dyingPlayerId].shield, playerId: dyingPlayerId, isReplenishing: FENDPLAYERS[dyingPlayerId].shieldReplenish }))
      }, 1)
      FENDPLAYERS[dyingPlayerId].energyReplenish = setInterval(() => {        
        FENDPLAYERS[dyingPlayerId].replenishEnergy()
      }, 10)}
      gsap.to(FENDPLAYERS[dyingPlayerId], {
        duration: 0.202,  // Duration of each fade in/out
        opacity: 0,     // Target opacity for fade out
        repeat: 15,      // Total number of repeats (15 repetitions will make it blink 8 times)
        yoyo: true,     // Enable yoyo effect to fade back in
        ease: "power1.inOut",  // Optional: ease function for smooth animation
        onComplete: () => {
          FENDPLAYERS[dyingPlayerId].opacity = 1
          FENDPLAYERS[dyingPlayerId].isRespawning = false
          if (dyingPlayerId === SOCKET.id) {
          clearInterval(FENDPLAYERS[dyingPlayerId].energyReplenish)
          clearInterval(FENDPLAYERS[dyingPlayerId].shieldReplenish)
          FENDPLAYERS[dyingPlayerId].shield = 100
          FENDPLAYERS[dyingPlayerId].energy = 200
          FENDPLAYERS[dyingPlayerId].energyReplenish = null
          FENDPLAYERS[dyingPlayerId].shieldReplenish = null
          
            SOCKET.emit('updateShield',
              ({ shield: 100, playerId: dyingPlayerId, isReplenishing: null }))
          }
          gsap.killTweensOf(FENDPLAYERS[dyingPlayerId])
        }
      })      
    }, RESPAWNTIME * 1000)
  }
})

//                          ANIMATION START

let lastAnimationTime = 0;
let animationPaused = false;
let animationId
function animate() {  
  const startTime = performance.now();
  if (!glInitialized) {
    console.error('WebGL not initialized, animation stopped')
    return
  }  
  updateTextureCoordinates()

  drawBackground()
  
  c.clearRect(0, 0, canvas.width, canvas.height)
  calcAimData()
  if (Object.keys(FENDPROJECTILES).length !== 0) {  
    for (const id in FENDPROJECTILES) {
      FENDPROJECTILES[id].bAngle = bAngle + Math.PI;
      FENDPROJECTILES[id].update();
    }
  }
  for (const id in FENDPLAYERS) {
    const frontEndPlayer = FENDPLAYERS[id]
    if (frontEndPlayer.target && !frontEndPlayer.isDead) {
      FENDPLAYERS[id].x +=
        (FENDPLAYERS[id].target.x - FENDPLAYERS[id].x) * 0.5
      FENDPLAYERS[id].y +=
        (FENDPLAYERS[id].target.y - FENDPLAYERS[id].y) * 0.5
    }
  c.save()    
    if (!frontEndPlayer.isDead) {
      frontEndPlayer.bAngle = bAngle + Math.PI
      FENDPLAYERS[id].gradient = c.createRadialGradient(FENDPLAYERS[id].x + (FENDPLAYERS[id].radius + 10.5) * Math.cos(FENDPLAYERS[id].bAngle),
        FENDPLAYERS[id].y + (FENDPLAYERS[id].radius + 10.5) * Math.sin(FENDPLAYERS[id].bAngle), 11,
        FENDPLAYERS[id].x + (FENDPLAYERS[id].radius + 15) * Math.cos(FENDPLAYERS[id].bAngle),
        FENDPLAYERS[id].y + (FENDPLAYERS[id].radius + 15) * Math.sin(FENDPLAYERS[id].bAngle), 30)
      FENDPLAYERS[id].gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Shine effect at the start
      FENDPLAYERS[id].gradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.8)'); // Shine effect at the start
      FENDPLAYERS[id].gradient.addColorStop(0.8, FENDPLAYERS[id].craft.mColor);               // Your color in the middle
      FENDPLAYERS[id].gradient.addColorStop(0.85, 'rgba(32, 33, 33, 0.1)');                 // Slightly darker at the end
      FENDPLAYERS[id].gradient.addColorStop(0.92, 'rgba(32, 33, 33, 0.2)');                 // Slightly darker at the end
      FENDPLAYERS[id].gradient.addColorStop(1, 'rgba(32, 33, 33, 0.3)');                 // Slightly darker at the end      
      //if (id === SOCKET.id) {
        frontEndPlayer.drawEnergyWidget()
     // }            
      frontEndPlayer.draw()
      frontEndPlayer.drawCannon()            
      frontEndPlayer.drawShield()      
      if (id === SOCKET.id) frontEndPlayer.drawStats()
    }
    frontEndPlayer.drawText()
    c.restore()
    
  }

  for (const id in ACTIVE_SPRITES) {    
    ACTIVE_SPRITES[id].draw()
    if (ACTIVE_SPRITES[id].finished) delete ACTIVE_SPRITES[id];
  }
  
  let flag = false //flag to check if to update backEndParticles to delete the dead ones
  for (const id in FENDPARTICLES) {    
    const frontEndParticle = FENDPARTICLES[id]
    frontEndParticle.update()
    if (frontEndParticle.alpha <= 0) {
      delete FENDPARTICLES[id]     
        flag = true        
      }
  }

  if (flag) SOCKET.emit('updateBackEndParticles', FENDPARTICLES)        

  const endTime = performance.now(); // End measuring time
  const frameTime = endTime - startTime; // Calculate the duration
  const threshold = 2; // Example threshold in milliseconds (~60 FPS)

  if (frameTime > threshold) {
    console.log(`${formatDate(new Date(Date.now()))} - Animation frame took ${frameTime.toFixed(1)}ms`);
  }
  animationId = requestAnimationFrame(animate)
}

function formatDate(date) {
  const d = date || new Date();

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const milliseconds = String(d.getMilliseconds()).padStart(3, '0');

  return `${day}/${month}/${year} - ${hours}:${minutes}:${seconds}.${milliseconds}`;
}
 
// This interval essentially acts as a double to the movement event listener, calculates new positions to be sent to the server

setInterval(() => {
  if (FENDPLAYERS[SOCKET.id]) {    
    if (!FENDPLAYERS[SOCKET.id].isDead) {
      if (Object.values(KEYS).some(key => key.pressed === true)) {
        let dynTopSpeed = Number((TOPSPEED / Math.sqrt(2)).toFixed(2))
        let energyPenalty = Number(((TOPSPEED * 0.28 * (1 - FENDPLAYERS[SOCKET.id].energy / 200)) / Math.sqrt(2)).toFixed(2))
        if (Object.values(KEYS).filter(key => key.pressed === true).length === 1) {
          dynTopSpeed = TOPSPEED
          energyPenalty = Number((TOPSPEED * 0.28 * (1 - FENDPLAYERS[SOCKET.id].energy / 200)).toFixed(2))
        }
        else if (Object.values(KEYS).filter(key => key.pressed === true).length > 2) {
          for (const key in KEYS) key.pressed = false
        }

        if (FENDPLAYERS[SOCKET.id].energy > 0) {
          FENDPLAYERS[SOCKET.id].energy -= ENERGYCOSTS.move

        } else FENDPLAYERS[SOCKET.id].energy = 0
        SOCKET.emit('updateEnergy', (FENDPLAYERS[SOCKET.id].energy))
        // Stuck left
        if (FENDPLAYERS[SOCKET.id].x - FENDPLAYERS[SOCKET.id].radius <= 0) {
          FENDPLAYERS[SOCKET.id].x = FENDPLAYERS[SOCKET.id].radius + 1; stuck = true
          if (stuckTimeout == null) {
            stuckTimeout = setTimeout(() => { stuck = false; stuckTimeout = null; }, 250)
          }
        }
        // Or right
        else if (FENDPLAYERS[SOCKET.id].x + FENDPLAYERS[SOCKET.id].radius >= canvas.width) {
          FENDPLAYERS[SOCKET.id].x = canvas.width - FENDPLAYERS[SOCKET.id].radius - 1; stuck = true
          if (stuckTimeout == null) {
            stuckTimeout = setTimeout(() => { stuck = false; stuckTimeout = null }, 250)
          }
        }
        // Stuck up
        if (FENDPLAYERS[SOCKET.id].y - FENDPLAYERS[SOCKET.id].radius <= 0) {
          FENDPLAYERS[SOCKET.id].y = FENDPLAYERS[SOCKET.id].radius + 1; stuck = true
          if (stuckTimeout == null) {
            stuckTimeout = setTimeout(() => { stuck = false; stuckTimeout = null }, 250)
          }
        }
        // Or down          
        else if (FENDPLAYERS[SOCKET.id].y + FENDPLAYERS[SOCKET.id].radius >= canvas.height) {
          FENDPLAYERS[SOCKET.id].y = canvas.height - FENDPLAYERS[SOCKET.id].radius - 1; stuck = true
          if (stuckTimeout == null) {
            stuckTimeout = setTimeout(() => { stuck = false; stuckTimeout = null}, 250)
          }
        }

        if (!stuck) {          
          //     Going up W
          if (KEYS.w.pressed && KEYS.lastYKey == 'w'/* && !KEYS.a.pressed && !KEYS.d.pressed*/) {

            sequenceNumber = check2Big(sequenceNumber)
            if (Math.abs(PLAYERSPEED.y) < dynTopSpeed - energyPenalty) PLAYERSPEED.y -= dV
            else PLAYERSPEED.y = -(dynTopSpeed - energyPenalty)
            PLAYERINPUTS.push({
              sequenceNumber,
              dx: 0, dy: PLAYERSPEED.y
            })
            FENDPLAYERS[SOCKET.id].y += PLAYERSPEED.y
            FENDPLAYERS[SOCKET.id].moveAngle = Math.atan2(PLAYERSPEED.y, PLAYERSPEED.x)
            SOCKET.emit('keydown', { key: 'w', sequenceNumber, PLAYERSPEED, y: FENDPLAYERS[SOCKET.id].y, moveAngle: FENDPLAYERS[SOCKET.id].moveAngle })
          }

          else // Going down S
            if (KEYS.s.pressed && KEYS.lastYKey == 's' /*&&!KEYS.a.pressed && !KEYS.d.pressed*/) {
              sequenceNumber = check2Big(sequenceNumber)
              if (PLAYERSPEED.y < dynTopSpeed - energyPenalty) { PLAYERSPEED.y += dV; }
              else PLAYERSPEED.y = dynTopSpeed - energyPenalty
              PLAYERINPUTS.push({
                sequenceNumber,
                dx: 0, dy: PLAYERSPEED.y
              })
              FENDPLAYERS[SOCKET.id].y += PLAYERSPEED.y
              FENDPLAYERS[SOCKET.id].moveAngle = Math.atan2(PLAYERSPEED.y, PLAYERSPEED.x)
              SOCKET.emit('keydown', { key: 's', sequenceNumber, PLAYERSPEED, y: FENDPLAYERS[SOCKET.id].y, moveAngle: FENDPLAYERS[SOCKET.id].moveAngle })
            }

          //  Going left A
          if (KEYS.a.pressed && KEYS.lastXKey == 'a'/* && !KEYS.s.pressed && !KEYS.w.pressed*/) {
            sequenceNumber = check2Big(sequenceNumber)
            if (Math.abs(PLAYERSPEED.x) < dynTopSpeed - energyPenalty) { PLAYERSPEED.x -= dV; }
            else PLAYERSPEED.x = -(dynTopSpeed - energyPenalty)
            FENDPLAYERS[SOCKET.id].x += PLAYERSPEED.x
            PLAYERINPUTS.push({
              sequenceNumber,
              dx: PLAYERSPEED.x, dy: 0
            })
            FENDPLAYERS[SOCKET.id].moveAngle = Math.atan2(PLAYERSPEED.y, PLAYERSPEED.x)
            SOCKET.emit('keydown', { key: 'a', sequenceNumber, PLAYERSPEED, x: FENDPLAYERS[SOCKET.id].x, moveAngle: FENDPLAYERS[SOCKET.id].moveAngle })
          }

          else    // Going right D
            if (KEYS.d.pressed && KEYS.lastXKey == 'd' /*&& !KEYS.s.pressed && !KEYS.w.pressed*/) {
              sequenceNumber = check2Big(sequenceNumber)

              if (PLAYERSPEED.x < dynTopSpeed - energyPenalty) { PLAYERSPEED.x += dV; }
              else PLAYERSPEED.x = dynTopSpeed - energyPenalty
              PLAYERINPUTS.push({
                sequenceNumber,
                dx: PLAYERSPEED.x, dy: 0
              })
              FENDPLAYERS[SOCKET.id].x += PLAYERSPEED.x
              FENDPLAYERS[SOCKET.id].moveAngle = Math.atan2(PLAYERSPEED.y, PLAYERSPEED.x)
              SOCKET.emit('keydown', { key: 'd', sequenceNumber, PLAYERSPEED, x: FENDPLAYERS[SOCKET.id].x, moveAngle: FENDPLAYERS[SOCKET.id].moveAngle })
            }
          FENDPLAYERS[SOCKET.id].thrusterOutput = Math.hypot(PLAYERSPEED.x, PLAYERSPEED.y)
        }
      }
      else {
        if (!decel.x) PLAYERSPEED.x = 0
        if (!decel.y) PLAYERSPEED.y = 0
        FENDPLAYERS[SOCKET.id].thrusterOutput = Math.hypot(PLAYERSPEED.x, PLAYERSPEED.y)
      }
    }
  } else return
}, 15)

document.querySelector('#usernameForm').addEventListener('submit', (event) => {
  event.preventDefault()
  document.querySelector('#usernameForm').style.display = 'none'
  SOCKET.emit('initGame', ({
    username: document.querySelector('#usernameInput').value,
    width: canvas.width,
    height: canvas.height,
    playerSpeed: { x: 0, y: 0 },
    x: textureX * canvas.width * distanceFromBg,
    y: textureY * canvas.height * distanceFromBg,
    radius: PLAYER_RADIUS,
    devicePixelRatio,
    RESPAWNTIME,
    FEdV: dV
  }))
})