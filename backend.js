const express = require('express')
const app = express()

const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server, {pingInterval: 2000, pingTimeout: 5000})
const port = 3000
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

const backEndPlayers = {}
const backEndProjectiles = {}
const playerSpeed = 7
const radius = 10
let canvas = {}
let projectileId = 0

io.on('connection', (socket) => {
    console.log('a user connected');
    

  io.emit('updatePlayers', backEndPlayers)
  socket.on('shoot', ({ x, y, angle }) => {
    projectileId++
    const velocity = {
      x: Math.cos(angle) * 10,
      y: Math.sin(angle) * 10
    }
    backEndProjectiles[projectileId] = {
      x, y, velocity,
      playerId: socket.id
    }
    
  })

  socket.on('initGame', ({ width, height, username }) => {
    console.log(username)
    backEndPlayers[socket.id] = {
      x: 1024 * Math.random(),
      y: 576 * Math.random(),
      color: `hsl(${360 * Math.random()}, 100%, 50%)`,
      sequenceNumber: 0,
      score: 0,
      username
    }
    // Initiate canvas
    canvas = {
      width, height
    }
    backEndPlayers[socket.id].radius = radius

    
  })

    socket.on('disconnect', (reason) => {
        console.log(reason)
        delete backEndPlayers[socket.id]
        io.emit('updatePlayers', backEndPlayers)
    })

  socket.on('keydown', ({ key, sequenceNumber }) => {
    if (!backEndPlayers[socket.id]) return
    backEndPlayer = backEndPlayers[socket.id]
    backEndPlayers[socket.id].sequenceNumber = sequenceNumber
    
    switch (key) {
      case 'w':
        backEndPlayers[socket.id].y -= playerSpeed
        break
      case 'a':
        backEndPlayers[socket.id].x -= playerSpeed
        break
      case 's':
        backEndPlayers[socket.id].y += playerSpeed
        break
      case 'd':
        backEndPlayers[socket.id].x += playerSpeed
        break
    }
    const playerSides = {
      left: backEndPlayer.x - backEndPlayer.radius,
      top: backEndPlayer.y - backEndPlayer.radius,
      right: backEndPlayer.x + backEndPlayer.radius,
      bottom: backEndPlayer.y + backEndPlayer.radius,
    }

    if (playerSides.left < 0) backEndPlayer.x = backEndPlayer.radius
    if (playerSides.top < 0) backEndPlayer.y = backEndPlayer.radius
    if (playerSides.right > 1024) backEndPlayer.x = 1024- backEndPlayer.radius
    if (playerSides.bottom > 576) backEndPlayer.y = 576-backEndPlayer.radius
    
  })
})

// backend Ticker

setInterval(() => {
  for (const id in backEndProjectiles) {
    backEndProjectiles[id].x += backEndProjectiles[id].velocity.x
    backEndProjectiles[id].y += backEndProjectiles[id].velocity.y
    const PROJECTILE_RADIUS = 2.2
    if (backEndProjectiles[id].x - 2*PROJECTILE_RADIUS >= backEndPlayers[backEndProjectiles[id].playerId]?.canvas?.width ||
      backEndProjectiles[id].x + 2*PROJECTILE_RADIUS <= 0 ||
      backEndProjectiles[id].y - 2*PROJECTILE_RADIUS >= backEndPlayers[backEndProjectiles[id].playerId]?.canvas?.height ||
      backEndProjectiles[id].y + 2*PROJECTILE_RADIUS <= 0) {      
      delete backEndProjectiles[id]
      continue
    }

    for (const playerId in backEndPlayers) {
      const backEndPlayer = backEndPlayers[playerId]

      // Collision detection
        const DISTANCE = Math.hypot(Math.abs(backEndProjectiles[id].x - backEndPlayer.x),
          Math.abs(backEndProjectiles[id].y - backEndPlayer.y))


        if (DISTANCE < PROJECTILE_RADIUS + backEndPlayer.radius &&
          backEndProjectiles[id].playerId !== playerId) {
          backEndPlayers[backEndProjectiles[id].playerId].score++
            console.log(backEndProjectiles)
          delete backEndProjectiles[id]
          delete backEndPlayers[playerId]  
          console.log(backEndProjectiles)
          break
        }
        
      
    }

  }

  io.emit('updateProjectiles', backEndProjectiles)
  io.emit('updatePlayers', backEndPlayers)
}, 15)

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

console.log('server did load fr fr')