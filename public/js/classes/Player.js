class Player {
  constructor({ x, y, radius, color, bAngle, username, isDead, ip, rand, isRespawning = false ,text = username, socket }) {
    this.x = x
    this.y = y
    this.socket = socket
    this.radius = radius
    this.color = color
    this.username = username
    this.text = text
    this.isDead = isDead
    this.isRespawning = isRespawning
    this.opacity = 1
    this.ip = ip
    this.playerSpeed = { x: 0, y: 0 }
    this.shield = 100
    this.energy = 200
    this.aimAngle = Math.random() * 2*Math.PI
    this.moveAngle = Math.random() * 2 * Math.PI
    this.newAngle = this.aimAngle + 2 * Math.PI
    this.angleCos = Math.cos(this.aimAngle);
    this.angleSin = Math.sin(this.aimAngle);
    this.replenishBuffer = null;
    this.shieldReplenish = null;    
    this.energyReplenish = null;
    this.thrusterOutput = 0;
    this.noiseSpeed = 0.005;
    this.reloadInt = null;
    this.energyDepleted = false    
    this.cannonRadius = 4
    this.cannonX = this.x + (this.radius + 5.5) * this.angleCos
    this.cannonY = this.y + (this.radius + 5.5) * this.angleSin
    this.points = [];
    this.numPoints = 10;
    this.baseRadius = this.radius * 3;
    this.bAngle = bAngle
    this.gradX1 = this.x - (this.radius + 10.5) * Math.cos(this.bAngle)
    this.gradY1 = this.y - (this.radius + 10.5) * Math.sin(this.bAngle)
    this.gradX2 = this.x + (this.radius + 10.5) * Math.cos(this.bAngle)
    this.gradY2 = this.y + (this.radius + 10.5) * Math.sin(this.bAngle)
    this.gradR1 = 20
    this.gradR2 = 20
    
    

    // Initialize control points
    for (let i = 0; i < this.numPoints; i++) {
      const angle = (this.moveAngle + Math.PI) + i * Math.PI * 2/this.numPoints;
      this.points.push({
        x: this.x + Math.cos(angle) * this.baseRadius,
        y: this.y + Math.sin(angle) * this.baseRadius,
        originX: this.x + Math.cos(angle) * this.baseRadius,
        originY: this.y + Math.sin(angle) * this.baseRadius,
        noiseOffsetX: rand[i] * 20,
        noiseOffsetY: rand[i+this.numPoints] * 20
      })
    }


  }  

  drawShield() {
    if (!this.isDead && this.shield > 0) {
      c.save()
      const noiseFactor = 2 + (100 - this.shield) / 300;
      if (this.shieldReplenish == null) this.noiseSpeed = 0.003 + (100 - this.shield) / 5000;
      else this.noiseSpeed = 0.03;
      const currentShieldRadius = this.baseRadius - 12 * (1 - this.shield / 100)
      let targetAngle;
      if (this.playerSpeed.x != 0 || this.playerSpeed.y != 0 || true) {
        targetAngle = this.moveAngle
      }
      else {
        targetAngle = this.aimAngle
      }      
      if (this.newAngle - targetAngle > 0) {
        this.newAngle += Math.min(this.newAngle - targetAngle, targetAngle - this.newAngle + 2 * Math.PI) / 5
      } else if (this.newAngle - targetAngle < 0) {
        this.newAngle -= Math.min(this.newAngle - targetAngle + 2 * Math.PI, targetAngle - this.newAngle) / 5
      }
      else this.newAngle = targetAngle            
      c.beginPath();
      c.moveTo(this.points[0].x, this.points[0].y);
      //let angle = Math.atan2(this.playerSpeed.y, this.playerSpeed.x)
      for (let i = 0; i < this.numPoints; i++) {
        const point = this.points[i];

        const angle = (this.newAngle + Math.PI) /*% (Math.PI *2)*/ + i * Math.PI * 2 / this.numPoints;
        const distanceFromCenter = currentShieldRadius + Math.sin(Date.now() * this.noiseSpeed + point.noiseOffsetX) * noiseFactor;

        point.x = this.x + Math.cos(angle) * distanceFromCenter;
        point.y = this.y + Math.sin(angle) * distanceFromCenter;
      }

      for (let i = 0; i < this.numPoints; i++) {
        const p0 = this.points[i];
        const p1 = this.points[(i + 1) % this.numPoints];
        const midX = (p0.x + p1.x) / 2;
        const midY = (p0.y + p1.y) / 2;

        c.quadraticCurveTo(p0.x, p0.y, midX, midY);
      }

      
      c.closePath()
      c.globalAlpha = 0.5
      c.shadowBlur = 40 * (this.shield/100)
      c.shadowColor = `rgba(0, 30, 255, 1)`
      const gradient = c.createRadialGradient(this.x, this.y,15, this.x, this.y, currentShieldRadius);
      
      gradient.addColorStop(0, 'rgba(0, 30, 255, 0)'); // Fully transparent center
      gradient.addColorStop(1, 'rgba(0, 30, 255, 0.7)'); // Fully opaque edge
      c.fillStyle = gradient
      c.fill();
      c.strokeStyle = this.color
      c.lineWidth = 1.5
      c.lineCap = "round";
      c.lineJoin = "round";
      c.stroke();
      
      c.restore()
    }
  }


  reload(clickBuffer, shootCost) {
    this.cannonX = this.x
    this.cannonY = this.y
    if (this.energy < shootCost) this.energyDepleted = true
    this.reloadInt = setInterval(() => {      
      if (this.cannonRadius < 4 && this.energy >= shootCost) {
        if (this.energyDepleted) {
          sounds.gunRestored.play()
          this.energyDepleted = false
        }
        this.cannonRadius += 0.42
        this.cannonX += this.angleCos/10
        this.cannonY += this.angleSin/10
      }
      else if (this.cannonRadius >= 4) {
        this.cannonRadius = 4
        clearInterval(this.reloadInt)
        
      }
      
      
      this.socket.emit('updateCannonRadius', this.cannonRadius)
    }, clickBuffer / 10)
    
  }

  drawCannon() {    
    if (!this.isDead) {
      this.cannonX = this.x + (this.radius + 5.5) * this.angleCos
      this.cannonY = this.y + (this.radius + 5.5) * this.angleSin
      c.globalAlpha = this.opacity
      c.beginPath()
      c.arc(this.cannonX, this.cannonY, this.cannonRadius, 0, Math.PI * 2, false)
      c.fillStyle = this.color
      c.fill()
      c.beginPath()
      this.gradient = c.createRadialGradient(this.x + (this.radius + 10.5) * Math.cos(this.bAngle),
        this.y + (this.radius + 10.5) * Math.sin(this.bAngle), 11,
        this.x + (this.radius + 10.5) * Math.cos(this.bAngle),
        this.y + (this.radius + 10.5) * Math.sin(this.bAngle), 32)
      this.gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Shine effect at the start
      this.gradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.8)'); // Shine effect at the start
      this.gradient.addColorStop(0.79, this.color);               // Your color in the middle
      this.gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.1)');                 // Slightly darker at the end
      this.gradient.addColorStop(0.9, 'rgba(0, 0, 0, 0.2)');                 // Slightly darker at the end
      this.gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');                 // Slightly darker at the end
      c.fillStyle = this.gradient;
      c.arc(this.cannonX, this.cannonY, this.cannonRadius, 0, Math.PI * 2, false)
      c.fill()     
    }   
  }

  drawStats() {
    if (!this.isDead) {
      c.save()
      let statsX = this.x + this.radius + 10;
      this.shieldN = `S: ${Math.min(this.shield, 100).toFixed(0)}%`
      this.energyN = `E: ${(Math.min(200, Math.max(this.energy, 0)) / 200 * 100).toFixed(0)}%`
      c.font = '600 14px Stick No Bills'
      c.lineWidth = 2
      c.fillStyle = this.color
      c.textAlign = 'left'

      const energyTxtWidth = c.measureText(this.energyN).width;
      const shieldTxtWidth = c.measureText(this.shieldN).width;

      let textWidth = Math.max(energyTxtWidth, shieldTxtWidth)
      if (statsX >= canvas.width - textWidth) {
        statsX = this.x - (this.radius + 10)
        c.textAlign = 'right'
      } else statsX = this.x + this.radius + 10
      c.strokeStyle = 'black'
      c.strokeText(this.shieldN, statsX, this.y - 2)
      c.strokeText(this.energyN, statsX, this.y + 11)
      c.fillText(this.energyN, statsX, this.y + 11)

      c.fillText(this.shieldN, statsX, this.y - 2)

      c.restore()
    }
  }
  

  replenishShield() {    
    if (this.shield < 100) {
      this.shield += 0.05+0.05*(this.energy/200);      
    }
    else {
      this.shield = 100
      clearInterval(this.shieldReplenish)
      this.shieldReplenish = null
    }    
  }

  drawEnergyWidget() {
    c.save()    
    if (!this.isDead) {
      if (this.energy >= 1)  
      {
        c.beginPath();
        c.arc(this.x, this.y, this.radius + 2.5, Math.PI+angle + ((1 - this.energy / 200) * Math.PI), 3*Math.PI+angle - ((1 - this.energy / 200) * Math.PI));      
        c.strokeStyle = this.color
        c.lineWidth = 2.5
        c.lineCap = "round";
        c.lineJoin = "round";
        c.stroke();
        c.beginPath()
        c.strokeStyle = this.gradient;
        c.arc(this.x, this.y, this.radius + 2.5, Math.PI + angle + ((1 - this.energy / 200) * Math.PI), 3 * Math.PI + angle - ((1 - this.energy / 200) * Math.PI));
        c.stroke()
      }     
    } 
    c.restore()
  }

  replenishEnergy() {
    if (this.energy < 200) {
      this.energy += 1 + Math.round((1 - this.energy / 200) * 100) /100
    } else {
      this.energy = 200
      clearInterval(this.energyReplenish)
      this.energyReplenish = null
    }
  }

  drawText() {
    let textX = this.x
    let textY = this.y - this.radius*2
    c.save()
    c.lineCap = "round";
    c.lineJoin = "round";
    c.fillStyle = 'white'
    c.strokeStyle = 'black'
    c.textAlign = 'center'
    c.lineWidth = 3;        
    const textWidth = c.measureText(this.text).width;
    const textMetrics = c.measureText(this.text);
    const actualHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
    if (this.isDead) {
      c.textBaseline = 'middle'
      c.font = '36px Stick No Bills'
      c.fillStyle = this.color
      textY = this.y
    }
    else {
      this.text = this.username
      c.font = '12px Zen Dots'
    }

    if (this.x <= textWidth) {
      textX = textWidth * 2
    }
      else if (this.x + this.radius >= canvas.width - textWidth) {
        textX = canvas.width - textWidth * 2
      }
    if (this.y - 2*this.radius <= actualHeight) {
      textY = this.y + actualHeight + this.radius
      c.textBaseline = 'top'
    }
      else if (this.y >= canvas.height - actualHeight) {
        textY = canvas.height - actualHeight
        c.textBaseline = 'bottom'
      }

    c.strokeText(this.text, textX, textY)
    c.fillText(this.text, textX, textY)    
    c.restore()
  }

  draw() {
    if (!this.isDead) {
      c.globalAlpha = this.opacity
      c.beginPath()
      c.fillStyle = this.color
      c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
      c.fill()  
      c.beginPath()        
      c.fillStyle = this.gradient;
      c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
      c.fill()      
      c.save()
      c.restore()
      
    }
    
  }  

  
  
}