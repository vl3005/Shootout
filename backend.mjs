import express from 'express'
const app = express()
const port = 3000
import http from 'http'
import util from 'util'
const server = http.createServer(app)
import { Server } from 'socket.io'
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import { setInterval } from 'timers'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000 })

//app.use(express.static('public'))

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

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
    delete backEndPlayers[SOCKET.id];
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
  SOCKET.on('updateEnergy', (energy) => {
    backEndPlayers[SOCKET.id].energy = energy
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
    console.log(crafts)
    if (availableCraftsInd.length > 0) {
      chosenCraftIndex = availableCraftsInd[Math.floor(Math.random() * availableCraftsInd.length)]      
    } else return 
    backEndPlayers[SOCKET.id] = {
      x,
      y,
      craft: crafts[chosenCraftIndex],
      chosenCraftIndex,
      energy:200,
      sequenceNumber: 0,
      score: 0,
      username,
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
    crafts[chosenCraftIndex].inUse = true
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
      backEndPlayers[SOCKET.id].x = backEndPlayer.radius + 1
      backEndPlayers[SOCKET.id].x += backEndPlayers[SOCKET.id].playerSpeed.x* -1.2
      SOCKET.emit('playerHitBarrier')
    } else
      if (playerSides.right >= canvas.width) {
        backEndPlayers[SOCKET.id].x = canvas.width - backEndPlayer.radius -1
        backEndPlayers[SOCKET.id].x += backEndPlayers[SOCKET.id].playerSpeed.x* -1.2
        SOCKET.emit('playerHitBarrier')
      }
    if (playerSides.top <= 0) {
      backEndPlayers[SOCKET.id].y = backEndPlayer.radius +1
      backEndPlayers[SOCKET.id].y += backEndPlayers[SOCKET.id].playerSpeed.y* -1.2
      SOCKET.emit('playerHitBarrier')
    } else    
    if (playerSides.bottom >= canvas.height) {
      backEndPlayers[SOCKET.id].y = canvas.height - backEndPlayer.radius -1
      backEndPlayers[SOCKET.id].y += backEndPlayers[SOCKET.id].playerSpeed.y * -1.2      
      SOCKET.emit('playerHitBarrier')
    }
    const end = process.hrtime.bigint(); // End timer
    const durationInMilliseconds = (Number(end - start)) / 1000000;

    // Format the duration to 4 decimal places
    const timerResult = durationInMilliseconds.toFixed(4);
    let warnTime = 0.2
    if (timerResult > warnTime) console.log(`${formatDate(new Date(Date.now()))} - KeyDown time: ${timerResult} ms`);

  })

  function speedChanged(old, current) {
    // Check if either value is zero
    if (current === 0) {
      return true;
    }

    // Check if the sign has changed
    return (old >= 0 && current < 0) || (old < 0 && current >= 0);
  }
  

  SOCKET.on('keyup', ({ key, KEYS, PLAYERSPEED }) => {
    let id = SOCKET.id
    if (backEndPlayers[id].isDead || !backEndPlayers[id]) return
    backEndPlayers[id].playerSpeed = PLAYERSPEED
    let changedX = false
    let changedY = false
    let tempXSpeed;
    let tempYSpeed;
    if (KEYS.w.pressed == false &&
      KEYS.a.pressed == false &&
      KEYS.s.pressed == false &&
      KEYS.d.pressed == false)
    {
      backEndPlayers[id].moveAngle += Math.PI
      backEndPlayers[id].moveAngle %= 2 * Math.PI
    }
    let factorX = 1
    let factorY = 1
    backEndPlayers[id].lastXKey = KEYS.lastXKey
    backEndPlayers[id].lastYKey = KEYS.lastYKey
    switch (key) {
      case 'KeyW':
        clearInterval(activeDecInts[id].y)
        activeDecInts[id].y = null        
        tempYSpeed = backEndPlayers[id].playerSpeed.y        
        SOCKET.emit('decelerating', ({ DecelY: true }))
        activeDecInts[id].y = setInterval(() => {
          if (backEndPlayers[id].isDead || !backEndPlayers[id]) {
            clearInterval(activeDecInts[id].y)
            activeDecInts[id].y = null
            return
          }
          backEndPlayers[id].playerSpeed.y += dV          
          if (!changedY && backEndPlayers[id].y - backEndPlayers[id].radius <= 0) {
            changedY = true
            factorY = -1
            SOCKET.emit('playerHitBarrier')
            backEndPlayers[id].y = backEndPlayers[id].radius + 1
            backEndPlayers[id].playerSpeed.y *= 1.1
          }
          
          backEndPlayers[id].y += backEndPlayers[id].playerSpeed.y * factorY
          if (speedChanged(tempYSpeed,backEndPlayers[id].playerSpeed.y)) {
            clearInterval(activeDecInts[id].y)
            activeDecInts[id].y = null
            SOCKET.emit('decelerating', ({ DecelY: false}))
            backEndPlayers[id].playerSpeed.y = 0
          } else { }
          backEndPlayers[id].thrusterOutput = Math.hypot(backEndPlayers[id].playerSpeed.y, backEndPlayers[id].playerSpeed.x)
          tempYSpeed = backEndPlayers[id].playerSpeed.y 
          SOCKET.emit('updateSpeed', ({ newSpeed: backEndPlayers[id].playerSpeed, id }))
          SOCKET.broadcast.emit('updateThruster', ({ Thruster: backEndPlayers[SOCKET.id].thrusterOutput, id: SOCKET.id }))
        }, 15)
          break
      case 'KeyA':
        clearInterval(activeDecInts[id].x)
        activeDecInts[id].x = null
        tempXSpeed = backEndPlayers[id].playerSpeed.x
        SOCKET.emit('decelerating', ({ DecelX: true }))
        activeDecInts[id].x = setInterval(() => {
          if (backEndPlayers[id].isDead || !backEndPlayers[id]) {
            clearInterval(activeDecInts[id].x)
            activeDecInts[id].x = null
            return
          }
          backEndPlayers[id].playerSpeed.x += dV
          if (!changedX && backEndPlayers[id].x - backEndPlayers[id].radius < 0) {
            changedX = true
            factorX = -1
            SOCKET.emit('playerHitBarrier')
            backEndPlayers[id].x = backEndPlayers[id].radius + 1
            backEndPlayers[id].playerSpeed.x *= 1.1
          }
          
          backEndPlayers[id].x += backEndPlayers[id].playerSpeed.x * factorX
          if (speedChanged(tempXSpeed, backEndPlayers[id].playerSpeed.x)) {
              clearInterval(activeDecInts[id].x)
              activeDecInts[id].x = null
              SOCKET.emit('decelerating', ({DecelX: false}))
              backEndPlayers[id].playerSpeed.x = 0
            } else { }          
          tempXSpeed = backEndPlayers[id].playerSpeed.x
          backEndPlayers[id].thrusterOutput = Math.hypot(backEndPlayers[id].playerSpeed.y, backEndPlayers[id].playerSpeed.x)
          SOCKET.emit('updateSpeed', ({ newSpeed: backEndPlayers[id].playerSpeed, id }))
          SOCKET.broadcast.emit('updateThruster', ({ Thruster: backEndPlayers[SOCKET.id].thrusterOutput, id: SOCKET.id }))
        }, 15)      
          break
      case 'KeyS':
        clearInterval(activeDecInts[id].y)
        activeDecInts[id].y = null
        tempYSpeed = backEndPlayers[id].playerSpeed.y
        SOCKET.emit('decelerating', ({ DecelY: true }))
        activeDecInts[id].y = setInterval(() => {
          if (backEndPlayers[id].isDead || !backEndPlayers[id]) {
            clearInterval(activeDecInts[id].y)
            activeDecInts[id].y = null
            return
          }
          backEndPlayers[id].playerSpeed.y -= dV
          if (!changedY && backEndPlayers[id].y + backEndPlayers[id].radius >= canvas.height) {
            changedY = true
            factorY = -1
            SOCKET.emit('playerHitBarrier')
            backEndPlayers[id].y = canvas.height - backEndPlayers[id].radius - 1
            backEndPlayers[id].playerSpeed.y *= 1.1
          }

          backEndPlayers[id].y += backEndPlayers[id].playerSpeed.y * factorY
          if (speedChanged(tempYSpeed, backEndPlayers[id].playerSpeed.y)) {
            clearInterval(activeDecInts[id].y)
            activeDecInts[id].y = null
            SOCKET.emit('decelerating', ({ DecelY: false }))
            backEndPlayers[id].playerSpeed.y = 0
          } else { }
          tempYSpeed = backEndPlayers[id].playerSpeed.y
          backEndPlayers[id].thrusterOutput = Math.hypot(backEndPlayers[id].playerSpeed.y, backEndPlayers[id].playerSpeed.x)          
          SOCKET.emit('updateSpeed', ({ newSpeed: backEndPlayers[id].playerSpeed, id }))
          SOCKET.broadcast.emit('updateThruster', ({ Thruster: backEndPlayers[SOCKET.id].thrusterOutput, id: SOCKET.id }))
        }, 15)
          break
      case 'KeyD':
        clearInterval(activeDecInts[id].x)
        activeDecInts[id].x = null
        tempXSpeed = backEndPlayers[id].x
        SOCKET.emit('decelerating', ({ DecelX: true }))
        activeDecInts[id].x = setInterval(() => {
          if (backEndPlayers[id].isDead || !backEndPlayers[id]) {
            clearInterval(activeDecInts[id].x)
            activeDecInts[id].x = null
            return
          }
          backEndPlayers[id].playerSpeed.x -= dV
          if (!changedX && backEndPlayers[id].x + backEndPlayers[id].radius >= canvas.width) {
            changedX = true
            factorX = -1
            SOCKET.emit('playerHitBarrier')
            backEndPlayers[id].x = canvas.width - backEndPlayers[id].radius - 1
            backEndPlayers[id].playerSpeed.x *= 1.1
          }

          backEndPlayers[id].x += backEndPlayers[id].playerSpeed.x * factorX
          if (speedChanged(tempXSpeed, backEndPlayers[id].playerSpeed.x)) {
            clearInterval(activeDecInts[id].x)
            activeDecInts[id].x = null
            SOCKET.emit('decelerating', ({ DecelX: false }))
            backEndPlayers[id].playerSpeed.x = 0
          } else { }
          tempXSpeed = backEndPlayers[id].playerSpeed.x
          backEndPlayers[id].thrusterOutput = Math.hypot(backEndPlayers[id].playerSpeed.y, backEndPlayers[id].playerSpeed.x)
          SOCKET.emit('updateSpeed', ({ newSpeed: backEndPlayers[id].playerSpeed, id }))
          SOCKET.broadcast.emit('updateThruster', ({ Thruster: backEndPlayers[SOCKET.id].thrusterOutput, id: SOCKET.id }))
        }, 15)   
        break
      }
    })
  })



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
      x: target.x + projectile.velocity.x*0.5,
      y: target.y + projectile.velocity.y * 0.5,
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

function checkObjBarrierCollision(obj, objRad) {
  if (obj.x + objRad >= canvas.width) return { side: 'right', hasCollided: true }
  if (obj.x - objRad <= 0) return { side: 'left', hasCollided: true }
  if (obj.y + objRad >= canvas.height) return { side: 'bottom', hasCollided: true }
  if (obj.y - objRad <= 0) return { side: 'top', hasCollided: true }
  return {side: '', hasCollided: false}
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

        //  Barrier Hit detection

        const COLLISION = checkObjBarrierCollision(backEndProjectiles[id], PROJECTILE_RADIUS)
        if (COLLISION.hasCollided) {
          if (backEndProjectiles[id].isSpent) {
              velFacX = backEndProjectiles[id].x
              velFacY = backEndProjectiles[id].y

              createParticles(backEndParticles, backEndProjectiles[id], backEndProjectiles[id], 5, 2, velFacX, velFacY, PROJECTILE_RADIUS, backEndProjectiles[id].craft.mColor)
              io.emit('updateParticles', { backEndParticles, randomI: Math.random() })            
              backEndProjectiles[id].isDead = true              
              io.emit('updateProjectiles', { backEndProjectiles, rand1: Math.random(), side: COLLISION.side, id })
              delete backEndProjectiles[id]
              break
          } else {
            backEndProjectiles[id].hasRicocheted = true
            backEndProjectiles[id].ricochetPens++
            switch (COLLISION.side) {
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
            io.emit('updateProjectiles', { backEndProjectiles, rand1: Math.random(), side: COLLISION.side, id })
            backEndProjectiles[id].hasRicocheted = false
            break
          }
          
        }

        //  Player Hit detection

        for (const playerId in backEndPlayers) {
          const backEndPlayer = backEndPlayers[playerId]
          const hitCircle = PROJECTILE_RADIUS + backEndPlayer.radius + 13 * (backEndPlayer.shield / 100)
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
              delete backEndProjectiles[id]
              backEndPlayers[playerId].isDead = true
              backEndPlayers[playerId].isRespawning = true
              countRespawn(playerId)
              console.log(`${formatDate(new Date(Date.now())) } - ${backEndPlayers[playerId].username} has died! Respawning soon...` )
              io.emit('playerDies', {dyingPlayerId: playerId, rand1: Math.random()})
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
              createParticles(backEndParticles, backEndProjectiles[id], backEndProjectiles[id], 1, 3, 500, 500, PROJECTILE_RADIUS * 1.2, backEndProjectiles[id].craft.mColor)
              createParticles(backEndParticles, backEndProjectiles[id], backEndPlayers[playerId], 7, 3, 500, 500, PROJECTILE_RADIUS * 0.9, 'rgba(0, 30, 255, 1)')
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

    // Fix players clipping randomly (For some unknown reason)

  for (const playerId in backEndPlayers) {
    const backEndPlayer = backEndPlayers[playerId]
    const PLAYER_BARR_COLLISION = checkObjBarrierCollision(backEndPlayer, backEndPlayer.radius)
    if (PLAYER_BARR_COLLISION.hasCollided && !(activeDecInts[playerId].x || activeDecInts[playerId].y)) //  Make sure every player is returned inside the canvas
    {
      switch (PLAYER_BARR_COLLISION.side) {
        case 'top':
          backEndPlayers[playerId].y = backEndPlayers[playerId].radius + 1
          clearInterval(activeDecInts[playerId].y)
          activeDecInts[playerId].y = null
          break
        case 'bottom':
          backEndPlayers[playerId].y = canvas.height - backEndPlayers[playerId].radius - 1
          clearInterval(activeDecInts[playerId].y)
          activeDecInts[playerId].y = null
          break
        case 'left':
          backEndPlayers[playerId].x = backEndPlayers[playerId].radius + 1
          clearInterval(activeDecInts[playerId].x)
          activeDecInts[playerId].x = null
          break
        case 'right':
          backEndPlayers[playerId].x = canvas.width - backEndPlayers[playerId].radius - 1
          clearInterval(activeDecInts[playerId].x)
          activeDecInts[playerId].x = null
          break
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
  if (timerResult > warnTime) console.log(`${formatDate(new Date(Date.now())) } - Back end ticker execution time: ${timerResult} ms.`);
}, 15)

server.listen(port, () => {
  console.log(`${formatDate(new Date(Date.now())) } - Game server listening on port ${port}.`)
})

console.log(`${formatDate(new Date(Date.now())) } - Server loaded.`)