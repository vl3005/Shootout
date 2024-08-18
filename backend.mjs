import express from 'express'
//const app = express()
//const port = 3000
import http from 'http'
import { Server } from 'socket.io'
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import { setInterval } from 'timers'

const app = express()
const port = 3000
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  console.log('get function');
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})



const server = http.createServer(app)

server.listen(port, () => {
  console.log(`${formatDate(new Date(Date.now()))} - Game server listening on port ${port}.`)
  console.log(`${formatDate(new Date(Date.now()))} - Server loaded.`)
})

const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000 })

const crafts = [
  { name: 'Void Raptor',      mColor: '#000000', /* Black */        sColor: '#f54242', aColor: '#FFFFFF', inUse: false, trlType: 1, hitType: 2 },
  { name: 'Strato-Seeker',    mColor: '#6f7dfc', /* Sky blue */     sColor: '#f54242', aColor: '#000000', inUse: false, trlType: 2, hitType: 2 },
  { name: 'Solar Falcon',     mColor: '#ffd700', /* Gold Yellow */  sColor: '#7dabf5', aColor: '#000000', inUse: false, trlType: 0, hitType: 0 },
  { name: 'Crimson Comet',    mColor: '#ff0d15', /* Red */          sColor: '#42f55a', aColor: '#000000', inUse: false, trlType: 2, hitType: 1 },
  { name: 'Emerald Vortex',   mColor: '#18fc03', /* Green */        sColor: '#f5f542', aColor: '#000000', inUse: false, trlType: 1, hitType: 3 },
  { name: 'Nebula Blossom',   mColor: '#fc79d1', /* Baby Pink */    sColor: '#42f55a', aColor: '#000000', inUse: false, trlType: 2, hitType: 1 },
  { name: 'Stellar Rose',     mColor: '#f707a3', /* Pink */         sColor: '#7dabf5', aColor: '#000000', inUse: false, trlType: 0, hitType: 0 },
  { name: 'Aqua Spirit',      mColor: '#00ffd7', /* Light Teal */   sColor: '#f5f542', aColor: '#000000', inUse: false, trlType: 1, hitType: 3 },
  { name: 'Cosmic Mirage',    mColor: '#880a91', /* Purple */       sColor: '#ffffff', aColor: '#000000', inUse: false, trlType: 2, hitType: 4 },
  { name: 'Nova Flare',       mColor: '#ff9e00', /* Orange */       sColor: '#ffffff', aColor: '#000000', inUse: false, trlType: 0, hitType: 4 },
  { name: 'Lunar Phantom',    mColor: '#969696', /* Silver */       sColor: '#f54242', aColor: '#000000', inUse: false, trlType: 2, hitType: 2 },
  { name: 'Arid Voyager',     mColor: '#947944', /* Tan */          sColor: '#7dabf5', aColor: '#000000', inUse: false, trlType: 1, hitType: 0 },
  { name: 'Galactic Spectre', mColor: '#ffffff', /* White */        sColor: '#42f55a', aColor: '#000000', inUse: false, trlType: 0, hitType: 1 },
]

const backEndPlayers = {}
const backEndProjectiles = {}
const backEndParticles = {}
const playerSocketIDs = new Map()
let socketIDArray = Array.from(playerSocketIDs.keys())
const activeDecInts = {}
let backEndPlayer;
let canvas = {}
let backEndRespawnTime;
const radius = 12.5
const PROJECTILE_RADIUS = 3.2
let projectileId = 0
let particleId = 0
let dV;
let velFacX;
let newBAngle=Math.random() * 2*Math.PI;
let velFacY;

function check2Big(num) {
  if (num == Number.MAX_SAFE_INTEGER) {
    return 0
  }
  else {
    return num + 1

  }
}
function checkCollision(playerA, playerB) {
  const dx = playerA.x - playerB.x; // Difference in X coordinates
  const dy = playerA.y - playerB.y; // Difference in Y coordinates
  const distance = Math.hypot(dx, dy); // Euclidean distance
  return distance < (2*playerA.radius+12); // Collision if distance < sum of radii
}
function siftArray(arr, property) {
  return arr
    .map((item, index) => item[property] === false ? index : -1) // Map to indices where property is false
    .filter(index => index !== -1); // Filter out -1 values
}

io.on('connection', (SOCKET) => {
  let temp = SOCKET.handshake.address;
  let ip;
  // If it's an IPv6 address with an embedded IPv4
  if (temp.startsWith('::ffff:')) {
    ip = temp.split(':').pop();  // Extract the IPv4 part
  } else ip = temp

  console.log(`${formatDate(new Date(Date.now())) } - New connection from IP: ${ip}`);
  SOCKET.emit('getNewAngle', newBAngle)

  SOCKET.on('disconnecting', (reason) => {
    console.log(`${formatDate(new Date(Date.now())) } - Disconnect event triggered for socket: ${SOCKET.id}, because ${reason}`);

    try {
      crafts[backEndPlayers[SOCKET.id].chosenCraftIndex].inUse = false
      
      console.log(`${formatDate(new Date(Date.now()))} - Got the craft back ${backEndPlayers[SOCKET.id].craft.name} ${crafts}`);
    } catch (error) {
      console.error(`${formatDate(new Date(Date.now())) } - Error in disconnect handler: ${error}`);
    }
    
    playerSocketIDs.delete(SOCKET.id)
    socketIDArray = Array.from(playerSocketIDs.keys())
    delete backEndPlayers[SOCKET.id];
    console.log(playerSocketIDs)
  });

  io.emit('updatePlayers', backEndPlayers)

  SOCKET.on('shoot', ({ x, y, angle, PROJ_SPEED }) => {
    if (backEndPlayers[SOCKET.id]){
    if (Object.keys(backEndProjectiles).length === 0) projectileId = 0
    else projectileId = check2Big(projectileId)
    const velocity = {
      x: Math.cos(angle) * PROJ_SPEED,
      y: Math.sin(angle) * PROJ_SPEED
    }
    backEndProjectiles[projectileId] = {
      x, y, velocity, speed: PROJ_SPEED,
      playerId: SOCKET.id,
      craft: backEndPlayers[SOCKET.id].craft,
      hasRicocheted: false,
      isSpent: false,
      willHit: false,
      isDead: false,
      ricochetPens: 0,
      radius: PROJECTILE_RADIUS,
      angle
      }
    }
  })
  SOCKET.on('spentProjectile', ({ id }) => {
    if (backEndProjectiles[id])
    backEndProjectiles[id].isSpent = true
  })
  SOCKET.on('onMap', () => {
    if (backEndPlayers[SOCKET.id])
    backEndPlayers[SOCKET.id].onMap = true
  }) 
  SOCKET.on('updateEnergy', ({newEnergy, energy}) => {
    if (backEndPlayers[SOCKET.id]) {
      backEndPlayers[SOCKET.id].energy = energy
      backEndPlayers[SOCKET.id].newEnergy = newEnergy

    }
  })

  SOCKET.on('updateShield', ({ shield, playerId, isReplenishing }) => {
    if (backEndPlayers[playerId]) {
      backEndPlayers[playerId].shield = shield
      backEndPlayers[playerId].isReplenishing = isReplenishing

      SOCKET.broadcast.emit('updateShieldInt', { shield, playerId, isReplenishing });
    }
    });
  SOCKET.on('initGame', ({ width, height, x, y, username, FEdV, isDead = false, radius, isRespawning, RESPAWNTIME, playerSpeed }) => {
    canvas = {
      width, height
    }
    dV = FEdV
    activeDecInts[SOCKET.id] = { x: null, y: null }
    let rand = [];
    let chosenCraftIndex = 0;
    for (let i = 0; i < 24; i++) rand.push(Math.random())
    const availableCraftsInd = siftArray(crafts, 'inUse')
    console.log(availableCraftsInd)
    if (availableCraftsInd.length > 0) {
      chosenCraftIndex = availableCraftsInd[Math.floor(Math.random() * availableCraftsInd.length)]      
    } else return 
    backEndPlayers[SOCKET.id] = {
      x,
      y,
      craft: crafts[chosenCraftIndex],
      chosenCraftIndex,
      energy: 200,
      newEnergy: 200,
      sequenceNumber: 0,
      score: 0,
      username,
      stuck: false,
      text: username,
      isDead,      
      onMap: false,
      ip,
      thrusterOutput:0,
      xDecInterval: 0,
      yDecInterval: 0,
      lastXKey: '',
      lastYKey: '',
      angleSin: 1,
      angleCos: 1,
      aimAngle: 0,
      isRespawning,
      cannonRadius: 4,
      radius,
      moveAngle: 0,
      playerSpeed,
      shield: 100,
      isReplenishing: null,
      rand
    }
    playerSocketIDs.set(SOCKET.id, SOCKET)
    socketIDArray.push(SOCKET.id)
    crafts[chosenCraftIndex].inUse = true
    console.log(playerSocketIDs,socketIDArray)
    console.log(`${ formatDate(new Date(Date.now()))} - ${backEndPlayers[SOCKET.id].ip}'s name is ${backEndPlayers[SOCKET.id].username}`)
    backEndRespawnTime = RESPAWNTIME   


  })

  SOCKET.on('updateCannonPosition', ({ angleCos, angleSin, angle}) => {
    backEndPlayers[SOCKET.id].angleCos = angleCos
    backEndPlayers[SOCKET.id].angleSin = angleSin
    backEndPlayers[SOCKET.id].aimAngle = angle
  })
  SOCKET.on('updateCannonRadius', (cannonRadius) => {
    if (!backEndPlayers[SOCKET.id] ||backEndPlayers[SOCKET.id].isDead) {
      try {
        clearInterval(activeDecInts[SOCKET.id].y)
        activeDecInts[SOCKET.id].y = null
        clearInterval(activeDecInts[SOCKET.id].x)
        activeDecInts[SOCKET.id].x = null
      }
      catch { console.error('Dude, what?') }
      return
    }
    backEndPlayers[SOCKET.id].cannonRadius = cannonRadius
  })
  SOCKET.on('updateBackEndParticles', (frontEndParticles) => {
    for (const id in backEndParticles) {
      if (!frontEndParticles[id])
        delete backEndParticles[id]
    }
  })
  
  SOCKET.on('keydown', ({ key, sequenceNumber, x,y, PLAYERSPEED, moveAngle }) => {
    if (!backEndPlayers[SOCKET.id] || backEndPlayers[SOCKET.id].isDead) return
    const start = process.hrtime.bigint(); // Start timer  
    backEndPlayer = backEndPlayers[SOCKET.id]    
    backEndPlayers[SOCKET.id].sequenceNumber = sequenceNumber
    backEndPlayers[SOCKET.id].moveAngle = moveAngle
    backEndPlayers[SOCKET.id].thrusterOutput = Math.hypot(PLAYERSPEED.x,PLAYERSPEED.y)
    let changedXDir = speedChanged(backEndPlayer.playerSpeed.x, PLAYERSPEED.x)
    let changedYDir = speedChanged(backEndPlayer.playerSpeed.y, PLAYERSPEED.y)
    backEndPlayers[SOCKET.id].playerSpeed = PLAYERSPEED
    //console.log(key)

    switch (key) {
      case 'w':
        if (!changedYDir) {
          clearInterval(activeDecInts[SOCKET.id].y)
          activeDecInts[SOCKET.id].y = null
        }
        backEndPlayers[SOCKET.id].y = y
        break
      case 's':
        if (!changedYDir) {
          clearInterval(activeDecInts[SOCKET.id].y)
          activeDecInts[SOCKET.id].y = null
        }
        backEndPlayers[SOCKET.id].y = y
        break
      case 'a':
        if (!changedXDir) {
          clearInterval(activeDecInts[SOCKET.id].x)
          activeDecInts[SOCKET.id].x = null
        }
        backEndPlayers[SOCKET.id].x = x
        break
      case 'd':
        if (!changedXDir) {
          clearInterval(activeDecInts[SOCKET.id].x)
          activeDecInts[SOCKET.id].x = null
        }
        backEndPlayers[SOCKET.id].x = x
        break
    }
    SOCKET.broadcast.emit('updateThruster', ({Thruster:backEndPlayers[SOCKET.id].thrusterOutput, id:SOCKET.id}))
    const playerSides = {
      left: backEndPlayer.x - backEndPlayer.radius,
      top: backEndPlayer.y - backEndPlayer.radius,
      right: backEndPlayer.x + backEndPlayer.radius,
      bottom: backEndPlayer.y + backEndPlayer.radius,
    }

    if (playerSides.left <= 0) {
      //backEndPlayers[SOCKET.id].x = backEndPlayer.radius + 1
      backEndPlayers[SOCKET.id].stuck = true
      SOCKET.emit('playerHitBarrier', 'left')
      setTimeout(() => {
        backEndPlayers[SOCKET.id].stuck = false
      }, 300)
      console.log(Math.sign(backEndPlayers[SOCKET.id].playerSpeed.x))
    } else
      if (playerSides.right >= canvas.width) {
        //backEndPlayers[SOCKET.id].x = canvas.width - backEndPlayer.radius -1
        backEndPlayers[SOCKET.id].stuck = true
        SOCKET.emit('playerHitBarrier', 'right')
        setTimeout(() => {
          backEndPlayers[SOCKET.id].stuck = false
        }, 300)
      }
    if (playerSides.top <= 0) {
      //backEndPlayers[SOCKET.id].y = backEndPlayer.radius +1
      backEndPlayers[SOCKET.id].stuck = true
      SOCKET.emit('playerHitBarrier','top')
      setTimeout(() => {
        backEndPlayers[SOCKET.id].stuck = false
      }, 300)
    } else    
    if (playerSides.bottom >= canvas.height) {
      //backEndPlayers[SOCKET.id].y = canvas.height - backEndPlayer.radius -1
      backEndPlayers[SOCKET.id].stuck = true
      SOCKET.emit('playerHitBarrier','bottom')
      setTimeout(() => {
        backEndPlayers[SOCKET.id].stuck = false
      }, 300)
    }
    const end = process.hrtime.bigint(); // End timer
    const durationInMilliseconds = (Number(end - start)) / 1000000;

    // Format the duration to 4 decimal places
    const timerResult = durationInMilliseconds.toFixed(4);
    let warnTime = 0.2
    if (timerResult > warnTime) console.log(`${formatDate(new Date(Date.now()))} - KeyDown time: ${timerResult} ms`);

  })
  

  SOCKET.on('keyup', ({ key, KEYS, PLAYERSPEED }) => {
    let id = SOCKET.id
    if (!backEndPlayers[id] || backEndPlayers[id].isDead) return
    backEndPlayers[id].playerSpeed = PLAYERSPEED 
    if (KEYS.w.pressed == false &&
      KEYS.a.pressed == false &&
      KEYS.s.pressed == false &&
      KEYS.d.pressed == false)
    {
      backEndPlayers[id].moveAngle += Math.PI
      backEndPlayers[id].moveAngle %= 2 * Math.PI
    }
    backEndPlayers[id].lastXKey = KEYS.lastXKey
    backEndPlayers[id].lastYKey = KEYS.lastYKey
    switch (key) {
      case 'KeyW':
        if (backEndPlayers[id].playerSpeed.y >= 0) return
        decelOnY(id,2)
        break
      case 'KeyA':
        if (backEndPlayers[id].playerSpeed.x >= 0) return
        decelOnX(id, 1)   
        break
      case 'KeyS':
        if (backEndPlayers[id].playerSpeed.y <= 0) return
        decelOnY(id, -2)
        break
      case 'KeyD':
        if (backEndPlayers[id].playerSpeed.x <= 0) return
        decelOnX(id, -1)       
        break
      }
    })
})
function speedChanged(old, current) {
  if (Math.sign(old) == Math.sign(current)) return false
  else return true
}
function checkBarrierSide(id, side) {
  switch (side) {
    case 2:
      if (backEndPlayers[id].y - backEndPlayers[id].radius <= 0) {
        backEndPlayers[id].y = backEndPlayers[id].radius + 1
        return true
      }
      else return false
      break
    case -2:
      if (backEndPlayers[id].y + backEndPlayers[id].radius >= canvas.height) {
        backEndPlayers[id].y = canvas.height - backEndPlayers[id].radius - 1
        return true
      }
      else return false
      break
    case 1:
      if (backEndPlayers[id].x - backEndPlayers[id].radius <= 0) {
        backEndPlayers[id].x = backEndPlayers[id].radius + 1
        return true
      }
      else return false
      break
    case -1:
      if (backEndPlayers[id].x + backEndPlayers[id].radius >= canvas.width) {
        backEndPlayers[id].x = canvas.width - backEndPlayers[id].radius - 1
        return true
      }
      else return false
      break
  }

}

function decelOnY(id, side) {
  clearInterval(activeDecInts[id].y)
  activeDecInts[id].y = null
  let changedY = false
  let factorY = 1
  let tempYSpeed = backEndPlayers[id].playerSpeed.y
  playerSocketIDs.get(id).emit('decelerating', ({ DecelY: true }))
  activeDecInts[id].y = setInterval(() => {
    if (backEndPlayers[id].isDead || !backEndPlayers[id]) {
      clearInterval(activeDecInts[id].y)
      activeDecInts[id].y = null
      return
    }
    backEndPlayers[id].playerSpeed.y += dV * Math.sign(side)
    if (!changedY && checkBarrierSide(id, side)) {
      changedY = true
      factorY = -1
      playerSocketIDs.get(id).emit('playerHitBarrier')
      backEndPlayers[id].playerSpeed.y *= 1.05
    }

    backEndPlayers[id].y += backEndPlayers[id].playerSpeed.y * factorY
    if (speedChanged(tempYSpeed, backEndPlayers[id].playerSpeed.y)) {
      clearInterval(activeDecInts[id].y)
      activeDecInts[id].y = null
      playerSocketIDs.get(id).emit('decelerating', ({ DecelY: false }))
      backEndPlayers[id].playerSpeed.y = 0
    } else { }
    tempYSpeed = backEndPlayers[id].playerSpeed.y
    if (backEndPlayers[id].stuck) backEndPlayers[id].thrusterOutput = 0
    else backEndPlayers[id].thrusterOutput = Math.hypot(backEndPlayers[id].playerSpeed.y, backEndPlayers[id].playerSpeed.x)
    playerSocketIDs.get(id).emit('updateSpeed', ({ newSpeed: backEndPlayers[id].playerSpeed, id }))
    playerSocketIDs.get(id).broadcast.emit('updateThruster', ({ Thruster: backEndPlayers[id].thrusterOutput, id }))
  }, 15)
}
function decelOnX(id, side) {
  clearInterval(activeDecInts[id].x)
  activeDecInts[id].x = null
  let changedX = false
  let factorX = 1
  let tempXSpeed = backEndPlayers[id].playerSpeed.x
  playerSocketIDs.get(id).emit('decelerating', ({ DecelX: true }))
  activeDecInts[id].x = setInterval(() => {
    if (backEndPlayers[id].isDead || !backEndPlayers[id]) {
      clearInterval(activeDecInts[id].x)
      activeDecInts[id].x = null
      return
    }
    backEndPlayers[id].playerSpeed.x += dV * Math.sign(side)
    if (!changedX && checkBarrierSide(id, side)) {
      changedX = true
      factorX = -1
      playerSocketIDs.get(id).emit('playerHitBarrier')
      backEndPlayers[id].playerSpeed.x *= 1.05
    }

    backEndPlayers[id].x += backEndPlayers[id].playerSpeed.x * factorX
    if (speedChanged(tempXSpeed, backEndPlayers[id].playerSpeed.x)) {
      clearInterval(activeDecInts[id].x)
      activeDecInts[id].x = null
      playerSocketIDs.get(id).emit('decelerating', ({ DecelX: false }))
      backEndPlayers[id].playerSpeed.x = 0
    } else { }
    tempXSpeed = backEndPlayers[id].playerSpeed.x
    if (backEndPlayers[id].stuck) backEndPlayers[id].thrusterOutput = 0
    else backEndPlayers[id].thrusterOutput = Math.hypot(backEndPlayers[id].playerSpeed.y, backEndPlayers[id].playerSpeed.x)
    playerSocketIDs.get(id).emit('updateSpeed', ({ newSpeed: backEndPlayers[id].playerSpeed, id }))
    playerSocketIDs.get(id).broadcast.emit('updateThruster', ({ Thruster: backEndPlayers[id].thrusterOutput, id }))
  }, 15)
}

function createParticles(array, projectile,target,min, range, velFacX = 80, velFacY = 80, part_rad,color) {
  let thisVelFacX;
  let thisVelFacY;
  for (let i = 1; i <= Math.round((Math.random() * range)) + min; i++) {        
    if (velFacX >= canvas.width/*-2*PROJECTILE_RADIUS*/) thisVelFacX = -1
    else if (velFacX < 2 * PROJECTILE_RADIUS) thisVelFacX = 1
    else thisVelFacX = Math.pow(-1, Math.round(Math.random() + 2))
    if (velFacY >= canvas.height /*- 2 * PROJECTILE_RADIUS*/) thisVelFacY = -1
    else if (velFacY < 2 * PROJECTILE_RADIUS) thisVelFacY = 1
    else thisVelFacY = Math.pow(-1, Math.round(Math.random() + 2))
    let randomX = Math.random() * thisVelFacX
    if (Object.keys(backEndParticles).length === 0) particleId = 0
    else particleId = check2Big(particleId)
    array[particleId] = {
      x: target.x, //+ projectile.velocity.x*0.5,
      y: target.y, //+ projectile.velocity.y * 0.5,
      radius: part_rad * ((Math.random() * 0.2) + 0.7),
      velocity: {
        x: randomX * 1.2,
        y: (1 - Math.abs(randomX)) * 1.2 * thisVelFacY
      },
      color,
      particleId
    }
  }
  
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function countRespawn(playerId) {

  for (let i = backEndRespawnTime; i > 0; i--) {
    if (!backEndPlayers[playerId]) break;
    backEndPlayers[playerId].text = `[ ${i} ]`;
    console.log(`${formatDate(new Date(Date.now()))} - ${backEndPlayers[playerId].username}'s respawning in ${i}...`)
    io.emit('updateText', ({text: backEndPlayers[playerId].text, playerId}))
    if (i > 1) { 
      await sleep(1000); // Pause for 1 second
    } else {
      // Switch to counting tenths of seconds
      for (let j = 1; j > 0.1; j -= 0.1) {
        if (!backEndPlayers[playerId]) break;
        backEndPlayers[playerId].text = `[${j.toFixed(1)}]`; // Format to 1 decimal place
        io.emit('updateText', ({ text: backEndPlayers[playerId].text, playerId }))
        await sleep(100);
      }
      break; // Exit outer loop after finishing tenths of seconds countdown
    }
  }
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
function getVelocityVector(speedX, speedY) {
  return { x: speedX, y: speedY };
}
function resolveVelocities(velocity1, velocity2, normal) {
  const dot1 = velocity1.x * normal.x + velocity1.y * normal.y;
  const dot2 = velocity2.x * normal.x + velocity2.y * normal.y;

  return {
    normal1: dot1,
    normal2: dot2,
    tangent1: { x: velocity1.x - dot1 * normal.x, y: velocity1.y - dot1 * normal.y },
    tangent2: { x: velocity2.x - dot2 * normal.x, y: velocity2.y - dot2 * normal.y }
  };
}
function updateNormalComponents(normal1, normal2) {
  return { normal1: normal2, normal2: normal1 };
}
function combineComponents(normal1, tangent1, normal2, tangent2, normal) {
  const finalVelocity1 = {
    x: normal1 * normal.x + tangent1.x,
    y: normal1 * normal.y + tangent1.y
  };
  const finalVelocity2 = {
    x: normal2 * normal.x + tangent2.x,
    y: normal2 * normal.y + tangent2.y
  };

  return { finalVelocity1, finalVelocity2 };
}
function computeCollisionVelocities(player1SpeedX, player1SpeedY, player1Angle, player2SpeedX, player2SpeedY, player2Angle) {
  // Convert angles to velocity vectors
  const velocity1 = getVelocityVector(player1SpeedX, player1SpeedY);
  const velocity2 = getVelocityVector(player2SpeedX, player2SpeedY);

  // Assume normal vector (you need to calculate this based on the collision point)
  const normal = { x: Math.cos(player1Angle - player2Angle), y: Math.sin(player1Angle - player2Angle) };

  // Normalize normal vector
  const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
  normal.x /= length;
  normal.y /= length;

  // Resolve velocities into normal and tangent components
  const { normal1, normal2, tangent1, tangent2 } = resolveVelocities(velocity1, velocity2, normal);

  // Update normal components
  const { normal1: newNormal1, normal2: newNormal2 } = updateNormalComponents(normal1, normal2);

  // Combine components to get final velocities
  const { finalVelocity1, finalVelocity2 } = combineComponents(newNormal1, tangent1, newNormal2, tangent2, normal);

  return { finalVelocity1, finalVelocity2 };
}

function checkObjBarrierCollision(obj, objRad) {
  if (obj.x + objRad >= canvas.width) return 'right'
  if (obj.x - objRad <= 0) return 'left'
  if (obj.y + objRad >= canvas.height) return 'bottom'
  if (obj.y - objRad <= 0) return 'top'
  return false
}

//                                     BACK END TICKER
const PROJ_INCREMENTS = 3
setInterval(() => {
  const start = process.hrtime.bigint(); // Start timer  
  for (const id in backEndProjectiles) {
    for (let i = 0; i < PROJ_INCREMENTS; i++)
      if (backEndProjectiles[id]) {
        backEndProjectiles[id].x += backEndProjectiles[id].velocity.x / PROJ_INCREMENTS
        backEndProjectiles[id].y += backEndProjectiles[id].velocity.y / PROJ_INCREMENTS

        //  Projectile on Barrier Hit detection

        const COLLISION = checkObjBarrierCollision(backEndProjectiles[id], PROJECTILE_RADIUS)
        if (COLLISION) {
          if (backEndProjectiles[id].isSpent) {
              velFacX = backEndProjectiles[id].x
              velFacY = backEndProjectiles[id].y

              createParticles(backEndParticles, backEndProjectiles[id], backEndProjectiles[id], 5, 2, velFacX, velFacY, PROJECTILE_RADIUS, backEndProjectiles[id].craft.mColor)
              io.emit('updateParticles', { backEndParticles, randomI: Math.random() })            
              backEndProjectiles[id].isDead = true              
              io.emit('updateProjectiles', { backEndProjectiles, rand1: Math.random(), side: COLLISION, id })
              delete backEndProjectiles[id]
              break
          } else {
            backEndProjectiles[id].hasRicocheted = true
            backEndProjectiles[id].ricochetPens++
            switch (COLLISION) {
              case 'left':
                if (backEndProjectiles[id].velocity.x < 0)
                  backEndProjectiles[id].velocity.x *= -1
              break
              case 'right':
                if (backEndProjectiles[id].velocity.x > 0)
                  backEndProjectiles[id].velocity.x *= -1
              break
              case 'top':
                if (backEndProjectiles[id].velocity.y < 0)
                  backEndProjectiles[id].velocity.y *= -1
              break
              case 'bottom':
                if (backEndProjectiles[id].velocity.y > 0)
                  backEndProjectiles[id].velocity.y *= -1
              break
            }
            backEndProjectiles[id].angle = Math.atan2(backEndProjectiles[id].velocity.y, backEndProjectiles[id].velocity.x)
            io.emit('updateProjectiles', { backEndProjectiles, rand1: Math.random(), side: COLLISION, id })
            backEndProjectiles[id].hasRicocheted = false
            break
          }
          
        }

        //  Projectile on Player Hit detection

        for (const playerId in backEndPlayers) {
          const backEndPlayer = backEndPlayers[playerId]
          const hitCircle = PROJECTILE_RADIUS + backEndPlayer.radius + 14 * (backEndPlayer.shield / 100)
          const DISTANCE = Math.floor(Math.hypot(backEndProjectiles[id].x - backEndPlayer.x,
            backEndProjectiles[id].y - backEndPlayer.y))

          if (DISTANCE <= hitCircle && backEndProjectiles[id].playerId !== playerId &&
            !backEndPlayers[playerId].isDead && !backEndPlayers[playerId].isRespawning)
            if (backEndPlayer.shield <= 0) {
              backEndPlayers[backEndProjectiles[id].playerId].score++
              createParticles(backEndParticles, backEndProjectiles[id], backEndPlayers[playerId], 3, 1, 500, 500, radius, backEndPlayers[playerId].craft.mColor) // Particles of the player
              createParticles(backEndParticles, backEndProjectiles[id], backEndProjectiles[id], 6, 2, 500, 500, PROJECTILE_RADIUS, backEndProjectiles[id].craft.mColor) // Particles of the projectile
              io.emit('updateParticles', { backEndParticles })
              backEndProjectiles[id].isDead = true
              io.emit('updateProjectiles', { backEndProjectiles, rand1: Math.random(), rand2: Math.random(), id })
              backEndPlayers[playerId].isDead = true
              backEndPlayers[playerId].isRespawning = true
              countRespawn(playerId)
              console.log(`${formatDate(new Date(Date.now())) } - ${backEndPlayers[playerId].username} has died! Respawning soon...` )
              io.emit('playerDies', { dyingPlayerId: playerId, shooterId: backEndProjectiles[id].playerId, rand1: Math.random() })
              delete backEndProjectiles[id]
              setTimeout(() => {
                if (!backEndPlayers[playerId]) return
                backEndPlayers[playerId].isDead = false
                console.log(`${formatDate(new Date(Date.now()))} - ${backEndPlayers[playerId].username} is alive again!`)
              }, backEndRespawnTime * 1000)
              setTimeout(() => {
                if (!backEndPlayers[playerId]) return
                backEndPlayers[playerId].isRespawning = false
              }, (backEndRespawnTime + 3) * 1000)
              break
            }
            else {
              io.emit('playerHit', { rand1: Math.random(), rand2: Math.random(), playerId, id, shooterId: backEndProjectiles[id].playerId })
              createParticles(backEndParticles, backEndProjectiles[id], backEndProjectiles[id], 4, 2, 500, 500, PROJECTILE_RADIUS * 1.2, backEndProjectiles[id].craft.mColor)
              createParticles(backEndParticles, backEndProjectiles[id], backEndPlayers[playerId], 4, 3, 500, 500, PROJECTILE_RADIUS * 0.9, 'hsla(205, 100%, 50%, 1)')
              io.emit('updateParticles', { backEndParticles })
              backEndProjectiles[id].isDead = true
              io.emit('updateProjectiles', { backEndProjectiles, rand1: Math.random(), rand2: Math.random(), id })
              delete backEndProjectiles[id]
              break
            }
          else  // If not within hit distance
            io.emit('updateProjectiles', { backEndProjectiles, rand1: Math.random(), id })
        } // End of player Hit Detection loop
    }

  }

  // Fix players clipping randomly (For some unknown reason), and check for player on player collision
  

  for (let i = 0; i < socketIDArray.length; i++) {    
    const socketIDA = socketIDArray[i];
    const backEndPlayer = backEndPlayers[socketIDA]
    const PLAYER_BARR_COLLISION = checkObjBarrierCollision(backEndPlayer, backEndPlayer.radius)
    if (PLAYER_BARR_COLLISION && backEndPlayer.stuck) //  Make sure every player is returned inside the canvas
    {
      switch (PLAYER_BARR_COLLISION) {
        case 'top':
          backEndPlayers[socketIDA].y = backEndPlayer.radius + 1
          backEndPlayers[socketIDA].playerSpeed.y *= -1.05
          backEndPlayers[socketIDA].y += backEndPlayers[socketIDA].playerSpeed.y
          decelOnY(socketIDA, -2)
          console.log('helllo')
          break
        case 'bottom':
          backEndPlayers[socketIDA].y = canvas.height - backEndPlayer.radius - 1
          backEndPlayers[socketIDA].playerSpeed.y *= -1.05
          backEndPlayers[socketIDA].y += backEndPlayers[socketIDA].playerSpeed.y
          decelOnY(socketIDA, 2)
          break
        case 'left':
          backEndPlayers[socketIDA].x = backEndPlayer.radius + 1
          backEndPlayers[socketIDA].playerSpeed.x *= -1.05
          backEndPlayers[socketIDA].x += backEndPlayers[socketIDA].playerSpeed.x
          decelOnX(socketIDA, -1)
          console.log('stuck left')
          break
        case 'right':
          backEndPlayers[socketIDA].x = canvas.width - backEndPlayer.radius - 1
          backEndPlayers[socketIDA].playerSpeed.x *= -1.05
          backEndPlayers[socketIDA].x += backEndPlayers[socketIDA].playerSpeed.x
          decelOnX(socketIDA, 1)
          break
      }
    }
    for (let j = i + 1; j < socketIDArray.length; j++) {
      const socketIDB = socketIDArray[j];      
      if (checkCollision(backEndPlayers[socketIDA], backEndPlayers[socketIDB]) && (!backEndPlayers[socketIDA].stuck || !backEndPlayers[socketIDB].stuck)) {
        backEndPlayers[socketIDA].stuck = true
        backEndPlayers[socketIDB].stuck = true
        setTimeout(() => {
          if (!checkCollision(backEndPlayers[socketIDA], backEndPlayers[socketIDB])) {
            backEndPlayers[socketIDA].stuck = false
            backEndPlayers[socketIDB].stuck = false
          }
          else {
            let randY = (Math.random() * (canvas.height - 120) + 120)
            backEndPlayers[socketIDA].x = 120
            backEndPlayers[socketIDB].x = canvas.width - 120
            backEndPlayers[socketIDA].y = randY
            backEndPlayers[socketIDB].y = canvas.height - randY
            io.emit('untangle', ({ id1: socketIDA, id2: socketIDB, randY }))
            backEndPlayers[socketIDA].stuck = false
            backEndPlayers[socketIDB].stuck = false
          }          
        }, 300)
        const finalSpeeds = computeCollisionVelocities(backEndPlayers[socketIDA].playerSpeed.x, backEndPlayers[socketIDA].playerSpeed.y, backEndPlayers[socketIDA].moveAngle,
          backEndPlayers[socketIDB].playerSpeed.x, backEndPlayers[socketIDB].playerSpeed.y, backEndPlayers[socketIDB].moveAngle)
        backEndPlayers[socketIDA].playerSpeed.x = finalSpeeds.finalVelocity1.x *1.25
        backEndPlayers[socketIDA].playerSpeed.y = finalSpeeds.finalVelocity1.y*1.25
        backEndPlayers[socketIDB].playerSpeed.x = finalSpeeds.finalVelocity2.x*1.25
        backEndPlayers[socketIDB].playerSpeed.y = finalSpeeds.finalVelocity2.y*1.25
        backEndPlayers[socketIDA].moveAngle = Math.atan2(backEndPlayers[socketIDA].playerSpeed.y, backEndPlayers[socketIDA].playerSpeed.x)
        backEndPlayers[socketIDB].moveAngle = Math.atan2(backEndPlayers[socketIDB].playerSpeed.y, backEndPlayers[socketIDB].playerSpeed.x)
        backEndPlayers[socketIDA].y += backEndPlayers[socketIDA].radius * (1 + Math.sin(backEndPlayers[socketIDA].moveAngle))
        backEndPlayers[socketIDA].x += backEndPlayers[socketIDA].radius * (1 + Math.cos(backEndPlayers[socketIDA].moveAngle))
        backEndPlayers[socketIDB].y += backEndPlayers[socketIDB].radius * (1 + Math.sin(backEndPlayers[socketIDB].moveAngle))
        backEndPlayers[socketIDB].x += backEndPlayers[socketIDB].radius * (1 + Math.cos(backEndPlayers[socketIDB].moveAngle))
        decelOnX(socketIDA, Math.sign(backEndPlayers[socketIDA].playerSpeed.x)*-1)
        decelOnY(socketIDA, Math.sign(backEndPlayers[socketIDA].playerSpeed.y)*-2)
        decelOnX(socketIDB, Math.sign(backEndPlayers[socketIDB].playerSpeed.x)*-1)
        decelOnY(socketIDB, Math.sign(backEndPlayers[socketIDB].playerSpeed.y)*-2)
      }
    }
    
  }
   
  newBAngle = (newBAngle + 0.00005) % (2 * Math.PI)
  io.emit('getNewAngle', newBAngle)
  
  io.emit('updatePlayers', backEndPlayers)
  const end = process.hrtime.bigint(); // End timer
  const durationInMilliseconds = (Number(end - start)) / 1000000;

  // Format the duration to 4 decimal places
  const timerResult = durationInMilliseconds.toFixed(4);
  let warnTime = 2
  if (timerResult > warnTime) console.log(`${formatDate(new Date(Date.now()))} - Back end ticker exceeded ${warnTime}. Execution time: ${timerResult} ms.`);
}, 15)

