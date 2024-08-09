let keyHeld = false
let moveCrosshair = false
let moveTimeout
let RELOADTIME = 200
let justClicked = false

let playerPosition
let angle

window.addEventListener('keydown', (event) => {
  if (!FENDPLAYERS[SOCKET.id] || FENDPLAYERS[SOCKET.id].isDead) return
  //if (event.code == 'KeyW' || event.code == 'KeyA' ||
  //  event.code == 'KeyS' || event.code == 'KeyD' &&
  //if (!Object.values(keys).every(key => key.pressed === false) &&    
  switch (event.code) {
    case 'KeyM':
      event.preventDefault()
      if (Howler._muted) Howler.mute(false)
      else Howler.mute(true)
      break
    case 'Tab':
      event.preventDefault()
      document.getElementById("stats").style.display = 'inline'
      break
    case 'KeyW':
      KEYS.w.pressed = true
      keyHeld = true
        if (KEYS.lastYKey !== 'w') {
          KEYS.lastYKey = 'w'
          KEYS.s.pressed = false
          //if (PLAYERSPEED.y > 0) SOCKET.emit('keyup', { key: 'KeyS', PLAYERSPEED, FElastXKey: KEYS.lastXKey, FElastYKey: KEYS.lastYKey })
        } 
        break
      case 'KeyA':
        KEYS.a.pressed = true
        keyHeld = true
        if (KEYS.lastXKey !== 'a') {
          KEYS.lastXKey = 'a'
          KEYS.d.pressed = false
         // if (PLAYERSPEED.x > 0) SOCKET.emit('keyup', { key: 'KeyD', PLAYERSPEED, FElastXKey: KEYS.lastXKey, FElastYKey: KEYS.lastYKey })
        }    
        break
      case 'KeyS':
        KEYS.s.pressed = true
        keyHeld = true
        if (KEYS.lastYKey !== 's') {
          KEYS.lastYKey = 's'
          KEYS.w.pressed = false
          //if (PLAYERSPEED.y > 0) SOCKET.emit('keyup', { key: 'KeyW', PLAYERSPEED, FElastXKey: KEYS.lastXKey, FElastYKey: KEYS.lastYKey })
        }    
        break
      case 'KeyD':
        KEYS.d.pressed = true
        keyHeld = true
        if (KEYS.lastXKey !== 'd') {
          KEYS.lastXKey = 'd'
          KEYS.a.pressed = false
          //if (PLAYERSPEED.x > 0) SOCKET.emit('keyup', { key: 'KeyA', PLAYERSPEED, FElastXKey: KEYS.lastXKey, FElastYKey: KEYS.lastYKey })
        }    
        break
      default:
          return
  }  
  if (keyHeld) {
    clearInterval(FENDPLAYERS[SOCKET.id].energyReplenish)
    FENDPLAYERS[SOCKET.id].energyReplenish = null
    
    if (!sounds.move.playing(MOVESOUND[SOCKET.id])) {
      MOVESOUND[SOCKET.id] = sounds.move.play()      
    }
    if (sounds.move.volume(MOVESOUND[SOCKET.id]) <0.4)
      sounds.move.fade(0.02, 0.4, 500, MOVESOUND[SOCKET.id])
}
})


window.addEventListener('keyup', (event) => {
  if (!FENDPLAYERS[SOCKET.id] || FENDPLAYERS[SOCKET.id].isDead) return

  switch (event.code) {
    case 'Tab':
      event.preventDefault()
      document.getElementById("stats").style.display = 'none'
      return
    case 'KeyW':
      KEYS.w.pressed = false
      keyHeld = false
      SOCKET.emit('keyup', { key: event.code, PLAYERSPEED, FElastXKey: KEYS.lastXKey, FElastYKey: KEYS.lastYKey })
      break
    case 'KeyA':
      KEYS.a.pressed = false
      keyHeld = false
      SOCKET.emit('keyup', { key: event.code, PLAYERSPEED, FElastXKey: KEYS.lastXKey, FElastYKey: KEYS.lastYKey })
      break
    case 'KeyS':
      KEYS.s.pressed = false
      keyHeld = false
      SOCKET.emit('keyup', { key: event.code, PLAYERSPEED, FElastXKey: KEYS.lastXKey, FElastYKey: KEYS.lastYKey })
      break
    case 'KeyD':
      KEYS.d.pressed = false 
      keyHeld = false
      SOCKET.emit('keyup', { key: event.code, PLAYERSPEED, FElastXKey: KEYS.lastXKey, FElastYKey: KEYS.lastYKey })
      break
    default:
      return
  }
 

  if (KEYS.w.pressed == false &&
    KEYS.a.pressed == false &&
    KEYS.s.pressed == false &&
    KEYS.d.pressed == false) {
    console.log()
    if (!FENDPLAYERS[SOCKET.id].energy > 0)  // If player's energy drops below zero from movement spending, bring it back to 0
      FENDPLAYERS[SOCKET.id].energy = 0

    if (sounds.move.playing(MOVESOUND[SOCKET.id])) {
      sounds.move.fade(0.4, 0.02, 300, MOVESOUND[SOCKET.id])

    }
    FENDPLAYERS[SOCKET.id].moveAngle += Math.PI
    FENDPLAYERS[SOCKET.id].moveAngle %= 2*Math.PI    
    if (FENDPLAYERS[SOCKET.id].energyReplenish == null && energyRepBuffer == null) {
      energyRepBuffer = setTimeout(() => { 
      FENDPLAYERS[SOCKET.id].energyReplenish = setInterval(() => {
        FENDPLAYERS[SOCKET.id].replenishEnergy()
      }, 75)        
        energyRepBuffer = null
      },900)
    }
    
    
  }
})

document.addEventListener('blur', () => {
  KEYS.w.pressed = false
  KEYS.a.pressed = false
  KEYS.s.pressed = false
  KEYS.d.pressed = false
  console.log("yeah")
  animationPaused = true;
})


//const startMoving = () => {
//  moveCrosshair = true;
//  clearTimeout(moveTimeout); // Clear any existing timeout
//}

//const stopMoving = () => {
//  if (moveCrosshair) {
//    moveCrosshair = false;
//  }
//}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function emitShoot() {
  //const { top, left } = canvas.getBoundingClientRect()
  if (FENDPLAYERS[SOCKET.id].energy < ENERGYCOSTS.shoot)
    sounds.lowEnergy.play()
  while (holdFireButton && FENDPLAYERS[SOCKET.id].energy >= ENERGYCOSTS.shoot) {
    justClicked = true
    clearInterval(FENDPLAYERS[SOCKET.id].reloadInt)
    FENDPLAYERS[SOCKET.id].cannonRadius = 0

    if (!FENDPLAYERS[SOCKET.id].isRespawning) {
      clearInterval(FENDPLAYERS[SOCKET.id].energyReplenish)
      FENDPLAYERS[SOCKET.id].energyReplenish = null
      clearTimeout(energyRepBuffer)
      FENDPLAYERS[SOCKET.id].energy -= ENERGYCOSTS.shoot
    }
    FENDPLAYERS[SOCKET.id].reload(RELOADTIME, ENERGYCOSTS.shoot)
    //if (!moveCrosshair) {playerPosition = {
    //  x: FENDPLAYERS[SOCKET.id].x,
    //  y: FENDPLAYERS[SOCKET.id].y
    //}
    //calcAimData()  
    //}
    if (FENDPLAYERS[SOCKET.id].energy < ENERGYCOSTS.shoot)
      sounds.gunDead.play()
    energyRepBuffer = setTimeout(() => {
      if (FENDPLAYERS[SOCKET.id].energyReplenish == null)
        FENDPLAYERS[SOCKET.id].energyReplenish = setInterval(() => {
          FENDPLAYERS[SOCKET.id].replenishEnergy()
        }, 75)
      energyRepBuffer = null
    }, 1900)
    SOCKET.emit('shoot', {
      x: playerPosition.x,
      y: playerPosition.y,
      angle: FENDPLAYERS[SOCKET.id].aimAngle,
      PROJ_SPEED
    })

    await sleep(RELOADTIME)
    justClicked = false
  }

}


canvas.addEventListener('mousemove', (event) => {
  if (FENDPLAYERS[SOCKET.id]){
  MOUSEPOSITION.x = event.clientX
  MOUSEPOSITION.y = event.clientY
  }
   
 
})

//canvas.addEventListener('mouseleave', stopMoving);
//canvas.addEventListener('mouseout', stopMoving);

window.addEventListener('beforeunload', () => {
  SOCKET.emit('disconnecting')
})

canvas.addEventListener('mousedown', (event) => {
  if (FENDPLAYERS[SOCKET.id]) {
    switch (event.button)
    {
    case 0:
        {
          if (FENDPLAYERS[SOCKET.id].isDead || justClicked) return
          else if (!justClicked && !holdFireButton) {
            setTimeout(() => { justClicked = false }, RELOADTIME)
            holdFireButton = true
            justClicked = true
            //MOUSEPOSITION.x = event.clientX
            //MOUSEPOSITION.y = event.clientY
            //calcAimData(event)
            emitShoot()
    }}}
  }
})
    

addEventListener('mouseup', () => {
  //stopMoving()
  holdFireButton = false
})

