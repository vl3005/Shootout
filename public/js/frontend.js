
const canvas = document.getElementById('mainCanvas')
const c = canvas.getContext('2d')
const bCanvas = document.getElementById('bgCanvas');
const scale = window.devicePixelRatio
bCanvas.width = 4096//Math.floor(4096/scale)
bCanvas.height = 3072//Math.floor(3072 / scale)
const distanceFromBg = 350

console.log(scale)

const logicalWidth = 1280
const logicalHeight = logicalWidth * 9 / 16 

canvas.width = logicalWidth
canvas.height = logicalHeight

if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
  console.log('Web Audio API is supported and enabled.');
} else {
  console.log('Web Audio API is not supported or may be disabled.');
}


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

let textureY = (Math.random() * canvas.width * 0.9 + canvas.width * 0.05) / canvas.width / distanceFromBg;
let textureX = (Math.random() * canvas.height * 0.9 + canvas.height * 0.05) / canvas.height / distanceFromBg;
let bgX;
let bgY;
let normalizedCenterX;
let normalizedCenterY;
function updateTextureCoordinates() {
  bgX = Math.cos(bAngle)
  bgY = Math.sin(bAngle)
  normalizedCenterX = canvas.width /2 - bgX/0.7 * canvas.width / 2 - 80
  normalizedCenterY = canvas.height/2 - bgY/0.7 * canvas.height / 2
  bgX *= panRadius
  bgY *= panRadius
  if (FENDPLAYERS[SOCKET.id]) {
    const player = FENDPLAYERS[SOCKET.id];


    // Normalize player coordinates to texture space
    textureX = player.x / canvas.width / distanceFromBg;
    textureY = player.y / canvas.height / distanceFromBg;
  }
    // Calculate the offset
  bgX += textureX; // Center the texture around the player
  bgY += textureY; // Center the texture around the player
  
  
  //console.log(normalizedCenterX,normalizedCenterY)
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
bgImage.src = "../img/bbg4.png";
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
const ENERGYCOSTS = {shoot:6,move:0.01}
let PLAYERSPEED = { x: 0, y: 0 }
const PROJ_SPEED = 30
const TOPSPEED = 7.2
const dV = Number((TOPSPEED / 40).toFixed(2))
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
    MOUSEPOSITION.y - top -8- Math.round(playerPosition.y),
    MOUSEPOSITION.x - left -8- Math.round(playerPosition.x)
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
let stuckTimeout;


function isWithinRange(retNum, cmpNum, range) {
  if (Math.abs(retNum - cmpNum) <= range)
    return true
  else
    return false
}
function check3Big(num, obj) {
  if (num == Number.MAX_SAFE_INTEGER || Object.keys(obj).length === 0) {
    return 0
  }
  else {
    return num + 1
  }
}
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
      let shooterId = backEndProjectile.playerId
      FENDPROJECTILES[id].angle = backEndProjectile.angle
      FENDPROJECTILES[id].x = backEndProjectile.x
      FENDPROJECTILES[id].y = backEndProjectile.y
      FENDPROJECTILES[id].velocity = backEndProjectile.velocity
      FENDPROJECTILES[id].hasRicocheted = backEndProjectile.hasRicocheted
      FENDPROJECTILES[id].ricochetPens = backEndProjectile.ricochetPens
      //if (FENDPROJECTILES[id].hasRicocheted) sounds.barrierHits[Math.round(rand1 * (sounds.barrierHits.length - 1))].play()

      let spriteX = FENDPROJECTILES[id].x + (rand1 - 0.5) * 8, spriteY = FENDPROJECTILES[id].y + (rand2 - 0.5) * 8;
      
      switch (side) {
        case 'top': spriteY = 0; spriteX = FENDPROJECTILES[id].x; break
        case 'bottom': spriteY = canvas.height; spriteX = FENDPROJECTILES[id].x; break
        case 'left': spriteX = 0; spriteY = FENDPROJECTILES[id].y; break
        case 'right': spriteX = canvas.width; spriteY = FENDPROJECTILES[id].y; break
      }
      if (backEndProjectile.isDead) {        
        sounds.barrierHits[Math.round(rand1 * (sounds.barrierHits.length - 1))].play()
        actSprID = check3Big(actSprID, ACTIVE_SPRITES)
        sprToPush = FENDPLAYERS[shooterId].splashSprite.clone()
        sprToPush.resetSprite(spriteX, spriteY, rand1 * 2 * Math.PI)
        sprToPush.drawnHeight = 50 + 30 * (1 - FENDPROJECTILES[id].distanceRatio)
        sprToPush.OffsetX = sprToPush.drawnHeight * 0.1625
        sprToPush.drawnWidth = sprToPush.drawnHeight * 1.12
        ACTIVE_SPRITES[actSprID] = sprToPush        
        delete FENDPROJECTILES[id]
        }
      else if (side) {        
        sounds.barrierHits[Math.round(rand1 * (sounds.barrierHits.length - 1))].play()
        actSprID = check3Big(actSprID, ACTIVE_SPRITES)
        sprToPush = impSprite.clone()
        sprToPush.resetSprite(spriteX, spriteY, rand1*2*Math.PI)
        ACTIVE_SPRITES[actSprID] = sprToPush
        
      }
      
    }
  
  
})

SOCKET.on('playerHitSomething', ({ side, amount, rand}) => {
 
  FENDPLAYERS[SOCKET.id].stuck = true
  if (!side) {
    sounds.physicalHits[Math.round(rand * (sounds.physicalHits.length - 1))].play()
    if (FENDPLAYERS[SOCKET.id].shield > 0) {
      FENDPLAYERS[SOCKET.id].shield = Math.max(FENDPLAYERS[SOCKET.id].shield - amount, 0)
      startShieldReplinsh(SOCKET.id)
    }
    else {
      if (!FENDPLAYERS[SOCKET.id].isRespawning) FENDPLAYERS[SOCKET.id].newEnergy -= amount
      startEnergyReplenish(1400)
    }
  } else {
    if (!sounds.ouch.playing())
      sounds.ouch.play()  
    if (!FENDPLAYERS[SOCKET.id].isRespawning) FENDPLAYERS[SOCKET.id].newEnergy -= amount
  }
  

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
        actSprID = check3Big(actSprID, ACTIVE_SPRITES)
        const sprToPush = vrtxSprite.clone()
        sprToPush.resetSprite(backEndPlayer.x, backEndPlayer.y)
        ACTIVE_SPRITES[actSprID] = sprToPush
        sounds.vortex.play()
        SOCKET.emit('onMap')
      }
      const playerLabels = document.querySelector('#playerLabels')
      playerLabels.innerHTML += `<div data-id="${id}" class="stick-no-bills-big" data-score="${backEndPlayer.score}">${backEndPlayer.username}: <span id="${backEndPlayer.username}ScoreEl" style="text-align: right; color: ${backEndPlayers[id].craft.mColor} !important;">${backEndPlayer.score}</span></div>`
    }
    else {
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
      FENDPLAYERS[id].stuck = backEndPlayer.stuck
      
        if (id === SOCKET.id) {
          if (FENDPLAYERS[SOCKET.id].isDead)
            sounds.alarm.stop(alarm[SOCKET.id])          
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
          FENDPLAYERS[id].newEnergy = backEndPlayer.newEnergy
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

SOCKET.on('updateParticles', ({ backEndParticles }) => {
  
  for(particle in backEndParticles) {
    id = backEndParticles[particle].particleId
    if (FENDPARTICLES[id]) continue
    FENDPARTICLES[id] = new Particle({
      x: backEndParticles[id].x,
      y: backEndParticles[id].y,
      radius: backEndParticles[id].radius,
      velocity: backEndParticles[id].velocity,
      color: backEndParticles[id].color,
      rand: backEndParticles[id].rand,
      alpha: 1
    })
  }
  
})

let alarm = {}

SOCKET.on('untangle', ({ id1, id2, randY }) => {
  actSprID = check3Big(actSprID, ACTIVE_SPRITES)
  sprToPush = vrtxSprite.clone()
  sprToPush.resetSprite(60, randY)
  ACTIVE_SPRITES[actSprID] = sprToPush
  actSprID = check3Big(actSprID, ACTIVE_SPRITES)
  sprToPush = vrtxSprite.clone()
  sprToPush.resetSprite(canvas.width - 60, canvas.height - randY)
  ACTIVE_SPRITES[actSprID] = sprToPush
  sounds.vortex.play()
  FENDPLAYERS[id1].x = 60
  FENDPLAYERS[id2].x = canvas.width - 60
  FENDPLAYERS[id1].y = randY
  FENDPLAYERS[id2].y = canvas.height - randY
})
function startEnergyReplenish(waitTime) {
  if (thisPlayer.isRespawning) {
    console.log('RESPAWNING SO NO SHIT')
    return
  }

  clearInterval(thisPlayer.energyReplenish)
  thisPlayer.energyReplenish = null
  clearTimeout(energyRepBuffer)
  energyRepBuffer = setTimeout(() => {
    if (!thisPlayer.isDead && !thisPlayer.energyReplenish)
      thisPlayer.energyReplenish = setInterval(() => {
        thisPlayer.replenishEnergy()
        if (thisPlayer.newEnergy>=ENERGYCOSTS.shoot) thisPlayer.canReload = true
        thisPlayer.socket.emit('updateEnergy', ({ newEnergy: thisPlayer.newEnergy, energy: thisPlayer.energy }))
      }, 60)
    energyRepBuffer = null
  }, waitTime)
}
function startShieldReplinsh(playerId) {
  SOCKET.emit('updateShield', ({ shield: FENDPLAYERS[playerId].shield, playerId, isReplenishing: null }))
  clearTimeout(FENDPLAYERS[playerId].replenishBuffer)
  clearInterval(FENDPLAYERS[playerId].shieldReplenish)
  FENDPLAYERS[playerId].shieldReplenish = null
  FENDPLAYERS[playerId].replenishBuffer = null
  FENDPLAYERS[playerId].replenishBuffer = setTimeout(() => {
    sounds.shieldUp.play()
    FENDPLAYERS[playerId].shieldReplenish = setInterval(() => {
      if (FENDPLAYERS[playerId].shield > 20) sounds.alarm.pause(alarm[playerId])
      FENDPLAYERS[playerId].replenishShield()
      SOCKET.emit('updateShield', ({ shield: FENDPLAYERS[playerId].shield, playerId, isReplenishing: FENDPLAYERS[playerId].shieldReplenish }))

    }, 12)
  }, 4200)
  if (FENDPLAYERS[playerId].shield <= 15 && !sounds.alarm.playing(alarm[playerId]))
    alarm[playerId] = sounds.alarm.play()
}

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
    FENDPLAYERS[shooterId].newEnergy += (1 - FENDPROJECTILES[projId].distanceRatio) * 1/3 * ENERGYCOSTS.shoot
    SOCKET.emit('updateEnergy', ({newEnergy: FENDPLAYERS[SOCKET.id].newEnergy, energy: FENDPLAYERS[SOCKET.id].energy}))

  }
  if (SOCKET.id == playerId)  startShieldReplinsh(playerId)
}) 

SOCKET.on('playerDies', ({ dyingPlayerId, rand1, shooterId }) => {

  if (FENDPLAYERS[dyingPlayerId]) {
    
    actSprID = check3Big(actSprID, ACTIVE_SPRITES)
    sprToPush = explSprite.clone()
    sprToPush.resetSprite(FENDPLAYERS[dyingPlayerId].x, FENDPLAYERS[dyingPlayerId].y,rand1*2*Math.PI)
    ACTIVE_SPRITES[actSprID] = sprToPush
    FENDPLAYERS[dyingPlayerId].isDead = true
    dyingPlayer = FENDPLAYERS[dyingPlayerId]
    sounds.die.play()    
    if (shooterId === SOCKET.id) {
      let bonus = (200 - FENDPLAYERS[shooterId].newEnergy) * 0.2
      FENDPLAYERS[shooterId].newEnergy += bonus
      SOCKET.emit('updateEnergy', ({ newEnergy: FENDPLAYERS[SOCKET.id].newEnergy, energy: FENDPLAYERS[SOCKET.id].energy }))
    }
    if (dyingPlayerId === SOCKET.id) {
      clearTimeout(energyRepBuffer)
      sounds.move.stop(MOVESOUND[SOCKET.id])
      document.getElementById("stats").style.display = 'inline'
      clearInterval(FENDPLAYERS[dyingPlayerId].shieldReplenish)
      FENDPLAYERS[dyingPlayerId].shieldReplenish = null
      clearTimeout(FENDPLAYERS[dyingPlayerId].replenishBuffer)
      FENDPLAYERS[dyingPlayerId].replenishBuffer = null
      if (FENDPLAYERS[dyingPlayerId].x < 60) FENDPLAYERS[dyingPlayerId].x = 60
      else if (FENDPLAYERS[dyingPlayerId].x > canvas.width - 60) FENDPLAYERS[dyingPlayerId].x = canvas.width - 60
      if (FENDPLAYERS[dyingPlayerId].y < 60) FENDPLAYERS[dyingPlayerId].y = 60
      else if (FENDPLAYERS[dyingPlayerId].y > canvas.height - 60) FENDPLAYERS[dyingPlayerId].y = canvas.height - 60
    }

    setTimeout(() => {
      sounds.respawned.play()
      FENDPLAYERS[dyingPlayerId].opacity = 1
      document.getElementById("stats").style.display = 'none'
      FENDPLAYERS[dyingPlayerId].newEnergy = 0
      FENDPLAYERS[dyingPlayerId].isRespawning = true
      FENDPLAYERS[dyingPlayerId].isDead = false
      FENDPLAYERS[dyingPlayerId].text = FENDPLAYERS[dyingPlayerId].username
      
      actSprID = check3Big(actSprID, ACTIVE_SPRITES)
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
        SOCKET.emit('updateEnergy', ({ newEnergy: FENDPLAYERS[SOCKET.id].newEnergy, energy: FENDPLAYERS[SOCKET.id].energy }))
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
          FENDPLAYERS[dyingPlayerId].shield = 100
          FENDPLAYERS[dyingPlayerId].energy = 200
          if (dyingPlayerId === SOCKET.id) {
          clearInterval(FENDPLAYERS[dyingPlayerId].energyReplenish)
          clearInterval(FENDPLAYERS[dyingPlayerId].shieldReplenish)          
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
  c.save()
  c.clearRect(0, 0, canvas.width, canvas.height)
  calcAimData()  
  

  for (const id in FENDPLAYERS) {
    const frontEndPlayer = FENDPLAYERS[id]
    if (FENDPLAYERS[id].energy != FENDPLAYERS[id].newEnergy)
      if (isWithinRange(FENDPLAYERS[id].energy, FENDPLAYERS[id].newEnergy, 0.38)) {      
        FENDPLAYERS[id].energy = FENDPLAYERS[id].newEnergy
      }     

    if (frontEndPlayer.target && !frontEndPlayer.isDead) {
      if (decel.x) FENDPLAYERS[id].x +=
        (FENDPLAYERS[id].target.x - FENDPLAYERS[id].x) * 0.5
      if (decel.y) FENDPLAYERS[id].y +=
        (FENDPLAYERS[id].target.y - FENDPLAYERS[id].y) * 0.5
    }
    
      FENDPLAYERS[id].bAngle = Math.atan2(normalizedCenterY - FENDPLAYERS[id].y, normalizedCenterX - FENDPLAYERS[id].x)
      FENDPLAYERS[id].shieldAngle += 0.004 + 0.12*(1-FENDPLAYERS[id].shield/100)
      FENDPLAYERS[id].shieldAngle %= 2*Math.PI 
      let distFromNova = Math.hypot(normalizedCenterY - FENDPLAYERS[id].y, normalizedCenterX - FENDPLAYERS[id].x)
      let lightStrength = 1 - Math.min(1450, distFromNova) / 1450
      FENDPLAYERS[id].projSpinAngle = 4000*bAngle
      FENDPLAYERS[id].gradient = c.createRadialGradient(FENDPLAYERS[id].x + (FENDPLAYERS[id].radius + 9) * Math.cos(FENDPLAYERS[id].bAngle),
        FENDPLAYERS[id].y + (FENDPLAYERS[id].radius + 9) * Math.sin(FENDPLAYERS[id].bAngle), 6 + 9*lightStrength,
        FENDPLAYERS[id].x + (FENDPLAYERS[id].radius + 15) * Math.cos(FENDPLAYERS[id].bAngle),
        FENDPLAYERS[id].y + (FENDPLAYERS[id].radius + 15) * Math.sin(FENDPLAYERS[id].bAngle), 28 + 5*lightStrength)
      FENDPLAYERS[id].gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');                   // Creating the gradient effect for lighting
      FENDPLAYERS[id].gradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.8)');              // emitted from the main super nova on the
      FENDPLAYERS[id].gradient.addColorStop(0.8, FENDPLAYERS[id].craft.mColor);             // background image. This took a LOT of tweaking
      FENDPLAYERS[id].gradient.addColorStop(0.85, 'rgba(32, 33, 33, 0.1)');                 // so do not touch, unless you REALLY know 
      FENDPLAYERS[id].gradient.addColorStop(0.92, 'rgba(32, 33, 33, 0.2)');                 // what you're doing...
      FENDPLAYERS[id].gradient.addColorStop(1, 'rgba(32, 33, 33, 0.3)');                    
      if (id === SOCKET.id && FENDPLAYERS[id].energy != FENDPLAYERS[id].newEnergy) SOCKET.emit('updateEnergy', ({ newEnergy: FENDPLAYERS[SOCKET.id].newEnergy, energy: FENDPLAYERS[SOCKET.id].energy }))
             
      frontEndPlayer.draw()
      frontEndPlayer.drawEnergyWidget()           
      frontEndPlayer.drawCannon()            
      frontEndPlayer.drawShield()      
      if (id === SOCKET.id) {
        frontEndPlayer.drawStats()
      }
    frontEndPlayer.drawText()
    
  }  
  c.restore()

  for (const id in ACTIVE_SPRITES) {    
    ACTIVE_SPRITES[id].draw()
    if (ACTIVE_SPRITES[id].finished) {
      delete ACTIVE_SPRITES[id];
    }
  }
  if (Object.keys(FENDPROJECTILES).length !== 0) {
    for (const id in FENDPROJECTILES) {
      //FENDPROJECTILES[id].bAngle = bAngle * 6000;
      FENDPROJECTILES[id].update();
    }
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
  //console.log(FENDPARTICLES[Object.keys(FENDPARTICLES)[Object.keys(FENDPARTICLES).length - 1]]);

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

// This interval essentially acts as a double to the keydown event listener, calculates new positions to be sent to the server

setInterval(() => {
  if (FENDPLAYERS[SOCKET.id]) {    
    if (!FENDPLAYERS[SOCKET.id].isDead) {
      if (Object.values(KEYS).some(key => key.pressed === true)) {
        let dynTopSpeed = Number((TOPSPEED / Math.sqrt(2)).toFixed(2))
        let energyPenalty = Number(((TOPSPEED * 0.35 * (1 - FENDPLAYERS[SOCKET.id].energy / 200)) / Math.sqrt(2)).toFixed(2))
        if (Object.values(KEYS).filter(key => key.pressed === true).length === 1) {
          dynTopSpeed = TOPSPEED
          energyPenalty = Number((TOPSPEED * 0.35 * (1 - FENDPLAYERS[SOCKET.id].energy / 200)).toFixed(2))
        }
        else if (Object.values(KEYS).filter(key => key.pressed === true).length > 2) {
          for (const key in KEYS) key.pressed = false
        }
        if(!thisPlayer.isRespawning)
        {
          console.log('here')
          if (FENDPLAYERS[SOCKET.id].newEnergy > 0) {
            FENDPLAYERS[SOCKET.id].newEnergy -= ENERGYCOSTS.move

          } else FENDPLAYERS[SOCKET.id].newEnergy = 0
          SOCKET.emit('updateEnergy', ({ newEnergy: FENDPLAYERS[SOCKET.id].newEnergy, energy: FENDPLAYERS[SOCKET.id].energy }))
        }
        
        if (!FENDPLAYERS[SOCKET.id].stuck) {
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
        } else // if STUCK
        {
          FENDPLAYERS[SOCKET.id].thrusterOutput = 0
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