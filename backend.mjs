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


const availableColors = [
  '#6f7dfc'/*sky blue*/,
  '#ffd700'/*gold yellow*/,
  '#ff0d15'/*red*/,
  '#18fc03'/*green*/,
  '#ff84d4'/*baby pink*/,
  '#f511a5'/*pink*/,
  '#00ffd7'/*light teal*/,
  '#d300e1'/*purple*/,
  '#ff9e00'/*orange*/,
  '#969696'/*silver*/,
  '#947944'/*tan*/,
  '#ffffff'/*white*/] 

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
let newBAngle=0;
let velFacY;

io.on('connection', (SOCKET) => {
  let temp = SOCKET.handshake.address;
  let ip;
  // If it's an IPv6 address with an embedded IPv4
  if (temp.startsWith('::ffff:')) {
    ip = temp.split(':').pop();  // Extract the IPv4 part
  } else ip = temp

  console.log('New connection from IP:', ip);
  SOCKET.emit('getNewAngle', newBAngle)

  SOCKET.on('disconnecting', (reason) => {
    console.log(`Disconnect event triggered for socket: ${SOCKET.id}, because ${reason}`);

    try {
      availableColors.push(backEndPlayers[SOCKET.id].color);
      console.log('got the color back', availableColors);
    } catch (error) {
      console.error('Error in disconnect handler:', error);
    }
    delete backEndPlayers[SOCKET.id];
  });

  io.emit('updatePlayers', backEndPlayers)

  SOCKET.on('shoot', ({ x, y, angle, PROJ_SPEED }) => {
    if (projectileId == Number.MAX_SAFE_INTEGER) projectileId = 0
    else projectileId++
    const velocity = {
      x: Math.cos(angle) * PROJ_SPEED,
      y: Math.sin(angle) * PROJ_SPEED
    }
    backEndProjectiles[projectileId] = {
      x, y, velocity, speed: PROJ_SPEED,
      playerId: SOCKET.id,
      color: backEndPlayers[SOCKET.id].color,
      hasRicocheted: false,
      isSpent: false,
      willHit: false,
      hitDamage: 30,
      ricochetPens: 0,
      radius: PROJECTILE_RADIUS,
      angle
    }
  })
  SOCKET.on('spentProjectile', ({ id }) => {
    if (backEndProjectiles[id])
    backEndProjectiles[id].isSpent = true
  })
  SOCKET.on('updateHitDamage', ({ hitDamage, id }) => {
    if(backEndProjectiles[id])
      backEndProjectiles[id].hitDamage = hitDamage
  })
  SOCKET.on('updateShield', ({ shield, playerId, isReplenishing }) => {
    if (backEndPlayers[playerId]) {
      backEndPlayers[playerId].shield = shield
      backEndPlayers[playerId].isReplenishing = isReplenishing
    }
    });
  SOCKET.on('initGame', ({ width, height, x, y, username, FEdV, isDead = false, radius, isRespawning, RESPAWNTIME, playerSpeed }) => {
    canvas = {
      width, height
    }
    dV = FEdV
    activeDecInts[SOCKET.id] = { x: null, y: null }
    let rand = [];
    for (let i = 0; i < 24; i++) rand.push(Math.random())
    backEndPlayers[SOCKET.id] = {
      x,
      y,
      color: availableColors[Math.round(Math.random() * (availableColors.length - 1))],
      sequenceNumber: 0,
      score: 0,
      username,
      text: username,
      isDead,
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
    console.log(`${backEndPlayers[SOCKET.id].ip}'s name is ${backEndPlayers[SOCKET.id].username}'`)
    availableColors.splice(availableColors.indexOf(backEndPlayers[SOCKET.id].color), 1)
    backEndRespawnTime = RESPAWNTIME   


  })

  SOCKET.on('updateCannonPosition', ({ angleCos, angleSin, angle}) => {
    backEndPlayers[SOCKET.id].angleCos = angleCos
    backEndPlayers[SOCKET.id].angleSin = angleSin
    backEndPlayers[SOCKET.id].angle = angle
  })
  SOCKET.on('updateCannonRadius', (cannonRadius) => {
    if (backEndPlayers[SOCKET.id].isDead || !backEndPlayers[SOCKET.id]) {
      clearInterval(activeDecInts[id].y)
      activeDecInts[id].y = null
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
  

  SOCKET.on('keyup', ({ key, PLAYERSPEED, FElastXKey, FElastYKey}) => {
    let id = SOCKET.id
    if (backEndPlayers[id].isDead || !backEndPlayers[id]) return
    backEndPlayers[id].playerSpeed = PLAYERSPEED
    let changedX = false
    let changedY = false
    let tempXSpeed;
    let tempYSpeed;
    backEndPlayers[id].moveAngle += Math.PI
    backEndPlayers[id].moveAngle %= 2 * Math.PI
    let factorX = 1
    let factorY = 1
    backEndPlayers[id].lastXKey = FElastXKey
    backEndPlayers[id].lastYKey = FElastYKey
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
          SOCKET.emit('updateSpeed', (backEndPlayers[id].playerSpeed))
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
          tempYSpeed = backEndPlayers[id].playerSpeed.y 
          
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
          SOCKET.emit('updateSpeed', (backEndPlayers[id].playerSpeed))
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
          SOCKET.emit('updateSpeed', (backEndPlayers[id].playerSpeed))
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
          SOCKET.emit('updateSpeed', (backEndPlayers[id].playerSpeed))
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
    if (particleId == Number.MAX_SAFE_INTEGER) particleId = 0   // In the very rare off-chance that somehow the game is being played a verrrry long time
    else particleId++
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

    if (i > 1) { 
      await sleep(1000); // Pause for 1 second
    } else {
      // Switch to counting tenths of seconds
      for (let j = 1; j > 0.1; j -= 0.1) {
        if (!backEndPlayers[playerId]) break;
        backEndPlayers[playerId].text = `[${j.toFixed(1)}]`; // Format to 1 decimal place
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

              createParticles(backEndParticles, backEndProjectiles[id], backEndProjectiles[id], 5, 2, velFacX, velFacY, PROJECTILE_RADIUS, backEndProjectiles[id].color)
              io.emit('updateParticles', { backEndParticles, randomI: Math.random() })            
              delete backEndProjectiles[id]
              io.emit('updateProjectiles', { backEndProjectiles, randomI: Math.random() })
              break
          } else {
            backEndProjectiles[id].hasRicocheted = true
            backEndProjectiles[id].ricochetPens++
            console.log('rico', backEndProjectiles[id].hasRicocheted, backEndProjectiles[id].ricochetPens)
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
            io.emit('updateProjectiles', { backEndProjectiles, randomI: Math.random() })
            backEndProjectiles[id].hasRicocheted = false
            break
          }
          
        }

        //  Player Hit detection

        for (const playerId in backEndPlayers) {
          const backEndPlayer = backEndPlayers[playerId]
          const SAFE_DISTANCE = PROJECTILE_RADIUS + backEndPlayer.radius + 13 * (backEndPlayer.shield / 100)
          const DISTANCE = Math.floor(Math.hypot(backEndProjectiles[id].x - backEndPlayer.x,
            backEndProjectiles[id].y - backEndPlayer.y))

          if (DISTANCE <= SAFE_DISTANCE && backEndProjectiles[id].playerId !== playerId &&
            !backEndPlayers[playerId].isDead && !backEndPlayers[playerId].isRespawning)
            if (backEndPlayer.shield <= 0) {
              backEndPlayers[backEndProjectiles[id].playerId].score++
              createParticles(backEndParticles, backEndProjectiles[id], backEndPlayers[playerId], 3, 1, 500, 500, radius, backEndPlayers[playerId].color) // Particles of the player
              createParticles(backEndParticles, backEndProjectiles[id], backEndProjectiles[id], 6, 2, 500, 500, PROJECTILE_RADIUS, backEndProjectiles[id].color) // Particles of the projectile
              io.emit('updateParticles', { backEndParticles })
              delete backEndProjectiles[id]
              io.emit('updateProjectiles', { backEndProjectiles, randomI: Math.random() })
              backEndPlayers[playerId].isDead = true
              backEndPlayers[playerId].isRespawning = true
              countRespawn(playerId)
              io.emit('playerDies', playerId)
              setTimeout(() => {
                if (!backEndPlayers[playerId]) return
                backEndPlayers[playerId].isDead = false
                console.log(backEndPlayers[playerId], ' is alive again')
              }, backEndRespawnTime * 1000)
              setTimeout(() => {
                if (!backEndPlayers[playerId]) return
                backEndPlayers[playerId].isRespawning = false
              }, (backEndRespawnTime + 3) * 1000)
              break
            }
            else {
              io.emit('playerHit', { rand1: Math.random(), rand2: Math.random(), playerId, id, shooterId: backEndProjectiles[id].playerId })
              createParticles(backEndParticles, backEndProjectiles[id], backEndProjectiles[id], 1, 3, 500, 500, PROJECTILE_RADIUS * 1.2, backEndProjectiles[id].color)
              createParticles(backEndParticles, backEndProjectiles[id], backEndPlayers[playerId], 3, 4, 500, 500, PROJECTILE_RADIUS * 0.4, backEndPlayers[playerId].color)
              io.emit('updateParticles', { backEndParticles })
              delete backEndProjectiles[id]
              io.emit('updateProjectiles', { backEndProjectiles, randomI: Math.random() })
              break
            }
          else  // If not within hit distance
            io.emit('updateProjectiles', { backEndProjectiles, randomI: Math.random() })
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
          break
        case 'bottom':
          backEndPlayers[playerId].y = canvas.height - backEndPlayers[playerId].radius - 1
          break
        case 'left':
          backEndPlayers[playerId].x = backEndPlayers[playerId].radius + 1
          break
        case 'right':
          backEndPlayers[playerId].x = canvas.width - backEndPlayers[playerId].radius - 1
          break
      }
    }
  }

  newBAngle = (newBAngle + 0.0001) % (2 * Math.PI)
  io.emit('getNewAngle', newBAngle)
  
  io.emit('updatePlayers', backEndPlayers)
  const end = process.hrtime.bigint(); // End timer
  const durationInMilliseconds = (Number(end - start)) / 1000000;

  // Format the duration to 4 decimal places
  const timerResult = durationInMilliseconds.toFixed(4);
  let warnTime = 5
  if (timerResult > warnTime) console.log(`${formatDate(new Date(Date.now())) } - Back end ticker execution time: ${timerResult} ms`);
}, 15)

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

console.log('server did load fr fr')