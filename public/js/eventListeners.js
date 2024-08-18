let keyHeld = false
let moveCrosshair = false
let moveTimeout
let RELOADTIME = 200
let justClicked = false

let playerPosition
let angle
let startTime = 0

document.addEventListener('keydown', (event) => {
  if (!thisPlayer || thisPlayer.isDead) return
  if (keyHeld) {
    const endTime = Date.now()
    result = endTime - startTime
    console.log(`Keydown event waited ${result < 100 ? result : 'resetting'}`)
  }
  switch (event.code) {
    // TODO: Add a syphon effect
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
        } 
        break
      case 'KeyA':
        KEYS.a.pressed = true
        keyHeld = true
        if (KEYS.lastXKey !== 'a') {
          KEYS.lastXKey = 'a'
          KEYS.d.pressed = false
        }    
        break
      case 'KeyS':
        KEYS.s.pressed = true
        keyHeld = true
        if (KEYS.lastYKey !== 's') {
          KEYS.lastYKey = 's'
          KEYS.w.pressed = false
        }    
        break
      case 'KeyD':
        KEYS.d.pressed = true
        keyHeld = true
        if (KEYS.lastXKey !== 'd') {
          KEYS.lastXKey = 'd'
          KEYS.a.pressed = false
        }    
        break
      default:
          return
  }  
  if (keyHeld) {
    clearInterval(thisPlayer.energyReplenish)
    thisPlayer.energyReplenish = null
    
    if (!sounds.move.playing(MOVESOUND[thisPlayer.socket.id])) {
      MOVESOUND[thisPlayer.socket.id] = sounds.move.volume(0).play('main')
      sounds.move.once('play', () => {
        sounds.move.fade(0, 0.25, 250, MOVESOUND[thisPlayer.socket.id]);
      }, MOVESOUND[thisPlayer.socket.id]);
    }
  }
  startTime = Date.now()
})


document.addEventListener('keyup', (event) => {
  if (!thisPlayer || thisPlayer.isDead) return

  switch (event.code) {
    case 'Tab':
      event.preventDefault()
      document.getElementById("stats").style.display = 'none'
      return
    case 'KeyW':
      KEYS.w.pressed = false
      keyHeld = false
      SOCKET.emit('keyup', { key: event.code, PLAYERSPEED, KEYS})
      break
    case 'KeyA':
      KEYS.a.pressed = false
      keyHeld = false
      SOCKET.emit('keyup', { key: event.code, PLAYERSPEED, KEYS})
      break
    case 'KeyS':
      KEYS.s.pressed = false
      keyHeld = false
      SOCKET.emit('keyup', { key: event.code, PLAYERSPEED, KEYS})
      break
    case 'KeyD':
      KEYS.d.pressed = false 
      keyHeld = false
      SOCKET.emit('keyup', { key: event.code, PLAYERSPEED, KEYS})
      break
    default:
      return
  }
 
  if (KEYS.w.pressed == false &&
    KEYS.a.pressed == false &&
    KEYS.s.pressed == false &&
    KEYS.d.pressed == false) {
    if (!thisPlayer.newEnergy > 0)  // If player's energy drops below zero from movement spending, bring it back to 0
      thisPlayer.newEnergy = 0

    if (sounds.move.playing(MOVESOUND[thisPlayer.socket.id])) {
      sounds.move.fade(0.25, 0.0, 250, MOVESOUND[thisPlayer.socket.id])
        .once('fade', () => {
          sounds.move.stop(MOVESOUND[thisPlayer.socket.id]);
        });

    }
    thisPlayer.moveAngle += Math.PI
    thisPlayer.moveAngle %= 2*Math.PI    
    if (thisPlayer.energyReplenish == null && energyRepBuffer == null) {
      energyRepBuffer = setTimeout(() => { 
      thisPlayer.energyReplenish = setInterval(() => {
        thisPlayer.replenishEnergy()
        thisPlayer.socket.emit('updateEnergy', ({newEnergy:thisPlayer.newEnergy, energy:thisPlayer.energy})) 
      }, 60)        
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
  animationPaused = true;
})

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function emitShoot() {
  if (thisPlayer.energy < ENERGYCOSTS.shoot)
    sounds.lowEnergy.play()
  while (holdFireButton && thisPlayer.newEnergy >= ENERGYCOSTS.shoot && !thisPlayer.isDead) {
    justClicked = true
    clearInterval(thisPlayer.reloadInt)
    thisPlayer.cannonRadius = 0
    if (!thisPlayer.isRespawning) {
      clearInterval(thisPlayer.energyReplenish)
      thisPlayer.energyReplenish = null
      clearTimeout(energyRepBuffer)
      thisPlayer.newEnergy -= ENERGYCOSTS.shoot
      thisPlayer.socket.emit('updateEnergy', ({ newEnergy: thisPlayer.newEnergy, energy: thisPlayer.energy })) 
    }
    thisPlayer.reload(RELOADTIME, ENERGYCOSTS.shoot)
    if (thisPlayer.newEnergy < ENERGYCOSTS.shoot)
      sounds.gunDead.play()
    energyRepBuffer = setTimeout(() => {
      if (!thisPlayer.isDead && !thisPlayer.energyReplenish)
        thisPlayer.energyReplenish = setInterval(() => {
          thisPlayer.replenishEnergy()
          thisPlayer.socket.emit('updateEnergy', ({ newEnergy: thisPlayer.newEnergy, energy: thisPlayer.energy })) 
        }, 60)
      energyRepBuffer = null
    }, 1900)
    SOCKET.emit('shoot', {
      x: playerPosition.x,
      y: playerPosition.y,
      angle: thisPlayer.aimAngle,
      PROJ_SPEED
    })

    await sleep(RELOADTIME)
    justClicked = false
  }

}


canvas.addEventListener('mousemove', (event) => {
  if (thisPlayer) {
    MOUSEPOSITION.x = event.clientX
    MOUSEPOSITION.y = event.clientY
  }
})

window.addEventListener('beforeunload', () => {
  thisPlayer.socket.emit('disconnecting')
})

canvas.addEventListener('mousedown', (event) => {
  if (thisPlayer) {
    switch (event.button) {
      case 0:
        {
          if (thisPlayer.isDead || justClicked) return
          else if (!justClicked && !holdFireButton) {
            setTimeout(() => { justClicked = false }, RELOADTIME)
            holdFireButton = true
            justClicked = true
            emitShoot()
          }
        }
    }
  }
})

addEventListener('mouseup', () => {
  holdFireButton = false
})

