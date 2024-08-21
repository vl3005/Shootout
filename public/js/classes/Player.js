class Player {
  constructor({ x, y, radius, craft, color, bAngle, username, onMap, isDead, ip, rand, isRespawning = false ,text = username, socket }) {
    this.x = x
    this.y = y
    this.socket = socket
    this.craft = craft
    this.radius = radius
    this.onMap =onMap
    this.username = username
    this.text = text
    this.isDead = isDead
    this.isReloading = false
    this.cannonLoaded = true
    this.canReload = true
    this.isRespawning = isRespawning
    this.opacity = 1
    this.ip = ip
    this.playerSpeed = { x: 0, y: 0 }
    this.shield = 100
    this.energy = 200
    this.newEnergy = 200
    this.aimAngle = Math.random() * 2*Math.PI
    this.moveAngle = Math.random() * 2 * Math.PI
    this.newAngle = this.aimAngle + 2 * Math.PI
    this.projSpinAngle = 0
    this.angleCos = Math.cos(this.aimAngle);
    this.angleSin = Math.sin(this.aimAngle);
    this.splashSprite = smlHitSprite.clone()
    this.shieldAngle = rand[5] * 2 * Math.PI
    this.splashSprite.image = imageMap.get(hitImages[this.craft.hitType])
    this.stuck = false
    this.replenishBuffer = null;
    this.shieldReplenish = null;    
    this.energyReplenish = null;
    this.thrusterOutput = 0;    
    this.thruster = trlSprites[craft.trlType].clone()    
    this.thruster.normY = 0
    this.noiseSpeed = 0.005;
    this.reloadInt = null;
    this.gunDead = false    
    this.cannonRadius = 4    
    this.cannonX = this.x + (this.radius + 5.5) * this.angleCos
    this.cannonY = this.y + (this.radius + 5.5) * this.angleSin
    this.points = [];
    this.numPoints = 10;
    this.baseRadius = this.radius * 2.7;
    this.bAngle = bAngle
    this.gradX1 = this.x - (this.radius + 10.5) * Math.cos(this.bAngle)
    this.gradY1 = this.y - (this.radius + 10.5) * Math.sin(this.bAngle)
    this.gradX2 = this.x + (this.radius + 10.5) * Math.cos(this.bAngle)
    this.gradY2 = this.y + (this.radius + 10.5) * Math.sin(this.bAngle)
    this.gradR1 = 20
    this.gradR2 = 20

    this.counter = 0;
    
    

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
      let noiseFactor = 1.6
      if (this.shieldReplenish == null) {
        this.noiseSpeed = 0.003 + (100 - this.shield) / 5000;
        noiseFactor = 1.8 + (1 - this.shield / 100) / 300
      }
      else {
        this.noiseSpeed = 0.03;
      }
      const currentShieldRadius = this.baseRadius - 12 * (1 - this.shield / 100)
      c.beginPath();
      c.moveTo(this.points[0].x, this.points[0].y);
      for (let i = 0; i < this.numPoints; i++) {
        const point = this.points[i];

        const angle = (this.shieldAngle) + i * Math.PI * 2 / this.numPoints;
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
      const gradient = c.createRadialGradient(this.x, this.y,12, this.x, this.y, currentShieldRadius);
      
      gradient.addColorStop(0, 'rgba(0, 30, 255, 0)'); // Fully transparent center
      gradient.addColorStop(1, 'hsla(205, 100%, 50%, 0.8)'); // Fully opaque edge
      c.fillStyle = gradient
      c.fill();
      c.strokeStyle = this.craft.mColor
      c.lineWidth = 1.5
      //c.lineCap = "round";
      //c.lineJoin = "round";
      c.stroke();
      
      c.restore()
    }
  }


  reload(clickBuffer, shootCost) {
    let steps = 0
    this.isReloading = false    
    if (this.newEnergy < shootCost) {
      this.gunDead = true
      this.canReload = false
      sounds.gunDead.play()
    }
    if (!this.isRespawning && this.canReload) {
      this.newEnergy -= ENERGYCOSTS.shoot
      this.socket.emit('updateEnergy', ({ newEnergy: this.newEnergy, energy: this.energy }))
    }
    this.reloadInt = setInterval(() => {      
      if (this.cannonRadius < 4 && this.canReload) {
        this.isReloading = true
        if (this.gunDead) {
          sounds.gunRestored.play()
          this.gunDead = false
        }
        
        this.cannonX = this.x + (this.radius + 2.5) * (steps / 10) * Math.cos(this.aimAngle)
        this.cannonY = this.y + (this.radius + 2.5) * (steps / 10) * Math.sin(this.aimAngle)
        steps++
        this.cannonRadius += 0.4
        this.energy += (Math.sign(this.newEnergy - this.energy) * shootCost / 10)
      }
      else if (this.cannonRadius + 0.4 >= 4) {
        this.cannonRadius = 4
        clearInterval(this.reloadInt)
        this.isReloading = false
        this.cannonLoaded = true
        this.cannonX = this.x + (this.radius + 2.5) * Math.cos(this.aimAngle)
        this.cannonY = this.y + (this.radius + 2.5) * Math.sin(this.aimAngle)
      }
      if (this.newEnergy >= shootCost) this.canReload = true
      this.socket.emit('updateCannonRadius', this.cannonRadius)
    
    }, clickBuffer / 10)
    
  }

  drawCannon() {    
    if (!this.isDead) {
      if (!this.isReloading) {
        this.cannonX = this.x + (this.radius + 2.5) * Math.cos(this.aimAngle)
        this.cannonY = this.y + (this.radius + 2.5) * Math.sin(this.aimAngle)
      }
      c.save()      
      c.shadowBlur = 4
      c.shadowColor = this.craft.sColor
      c.globalAlpha = this.opacity
      c.beginPath()
      c.arc(this.x + (this.radius + 2.5) * Math.cos(this.aimAngle), this.y + (this.radius + 2.5) * Math.sin(this.aimAngle), 1.5, 0, Math.PI * 2, false)
      c.moveTo(this.x + (this.radius + 2.5) * Math.cos(this.aimAngle), this.y + (this.radius + 2.5) * Math.sin(this.aimAngle))
      c.lineTo(this.cannonX, this.cannonY)
      c.strokeStyle = this.craft.sColor
      c.lineWidth = 2 * this.cannonRadius
      c.closePath()
      c.stroke()
      c.fillStyle = this.craft.sColor
      c.fill()      
      c.beginPath()
      c.shadowBlur = 4
      c.arc(this.cannonX, this.cannonY, this.cannonRadius, 0, Math.PI * 2, false)
      c.fillStyle = this.craft.mColor
      c.strokeStyle = this.craft.sColor
      c.lineWidth = 3
      c.stroke()
      c.fill()
      c.closePath()
      c.beginPath()
      this.cannonGradient = c.createRadialGradient(this.cannonX + (2 * this.cannonRadius) * Math.cos(this.projSpinAngle),
        this.cannonY + (2 * this.cannonRadius) * Math.sin(this.projSpinAngle), this.cannonRadius,
        this.cannonX + (2.2 * this.cannonRadius) * Math.cos(this.projSpinAngle),
        this.cannonY + (2.2 * this.cannonRadius) * Math.sin(this.projSpinAngle), 2.8*this.cannonRadius)
      this.cannonGradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); 
      this.cannonGradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.8)');
      this.cannonGradient.addColorStop(0.8, this.craft.mColor);               
      this.cannonGradient.addColorStop(0.85, 'rgba(32, 33, 33, 0.1)');                 
      this.cannonGradient.addColorStop(0.92, 'rgba(32, 33, 33, 0.2)');                
      this.cannonGradient.addColorStop(1, 'rgba(32, 33, 33, 0.3)');                
      c.fillStyle = this.cannonGradient;
      c.arc(this.cannonX, this.cannonY, this.cannonRadius, 0, Math.PI * 2, false)
      c.fill()     
      c.restore()
    }   
  }

  drawStats() {
    if (!this.isDead) {
      c.save()
      let statsX;
      let statsY = Math.max(22,Math.min(canvas.height-16,this.y+2))
      c.textAlign = 'left'
      this.shieldN = `S: ${Math.floor(Math.min(this.shield, 100))/*.toFixed(0)*/}%`
      this.energyN = `E: ${Math.floor(Math.min(200, Math.max(this.newEnergy, 0)) / 200 * 100)/*.toFixed(0)*/}%`
      c.shadowBlur = 3
      c.shadowColor = this.craft.sColor
      c.font = '800 18px Stick No Bills'
      c.lineWidth = 3
      c.fillStyle = this.craft.sColor
      const { left } = canvas.getBoundingClientRect()
      const energyTxtWidth = c.measureText(this.energyN).width;
      const shieldTxtWidth = c.measureText(this.shieldN).width;
      let textWidth = Math.max(energyTxtWidth, shieldTxtWidth)
      
      if (this.x - (this.radius + 22) < textWidth) {
        statsX = this.x + (this.radius + 22)
        //c.textAlign = 'left'
      }
      else if (this.x >= canvas.width - textWidth - 22 - this.radius) {
        statsX = this.x - (this.radius + 22) - textWidth
       // c.textAlign = 'right'
      } else if (MOUSEPOSITION.x - left > this.x) {
        statsX = this.x - (this.radius + 22) - textWidth
        //c.textAlign = 'right'
      } else {
        statsX = this.x + (this.radius + 22)
       // c.textAlign = 'left'
      }
      c.strokeStyle = 'black'
      c.textBaseline = 'bottom'
      c.strokeText(this.energyN, statsX, statsY)
      c.fillText(this.energyN, statsX, statsY)
      c.textBaseline = 'top'
      c.shadowColor = 'hsla(205, 100%, 50%, 1)'      
      c.fillStyle = 'hsla(205, 100%, 50%, 1)'      
      c.strokeStyle = 'black'
      c.strokeText(this.shieldN, statsX, statsY-2)
      c.fillText(this.shieldN, statsX, statsY-2)
      c.restore()
    }
  }

  replenishShield() {    
    if (this.shield < 100) {
      this.shield += 0.05 + 0.05 * (this.energy / 200);      
      this.counter++      
    }
    else {
      this.shield = 100
      clearInterval(this.shieldReplenish)
      this.shieldReplenish = null
      this.counter = 0
    }    
  }

  drawEnergyWidget() {     
    if (!this.isDead) {
      if (!this.isReloading) this.energy += Math.sign(this.newEnergy-this.energy)
      if (this.newEnergy >= 8)  
      {
        c.save()   
        c.beginPath();
        c.shadowColor = this.craft.sColor
        c.shadowBlur = 3
        c.arc(this.x, this.y, this.radius + 3, Math.PI + this.aimAngle + ((1 - this.energy / 200) * Math.PI), 3 * Math.PI + this.aimAngle - ((1 - this.energy / 200) * Math.PI));     
        c.closePath()
        c.fillStyle = this.craft.sColor
        
        c.globalAlpha = 0.06
        c.fill();
        c.beginPath()
        c.arc(this.x, this.y, this.radius + 3, Math.PI + this.aimAngle + ((1 - this.energy / 200) * Math.PI) + 0.05, 3 * Math.PI + this.aimAngle - ((1 - this.energy / 200) * Math.PI) - 0.05);      
        c.strokeStyle = this.craft.sColor
        c.lineWidth = 2
        c.globalAlpha = 1
        c.lineCap = "round";
        c.lineJoin = "round";
        c.stroke();
        c.restore()
      }     
    } 
    
  }


  replenishEnergy() {
    if (this.newEnergy < 200) {
      this.newEnergy += 0.5 + 1.27 * Math.round((1 - this.newEnergy / 200) * 100) / 100
      this.energy = this.newEnergy
    } else {
      this.newEnergy = 200
      this.energy = 200
      clearInterval(this.energyReplenish)
      this.energyReplenish = null
      
    }
  }

  drawText() {
    
    
    c.save()
    c.textBaseline = 'top'    
    const textWidth = c.measureText(this.text).width;
    let textX = Math.max(textWidth,Math.min(this.x,canvas.width-textWidth))
    const textMetrics = c.measureText(this.text);
    const actualHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
    let textY = Math.max(actualHeight, Math.min(this.y - this.radius * 3, canvas.height - 44))
    c.textAlign = 'center'
    if (this.isDead) {
      c.strokeStyle = this.craft.aColor
      
      c.font = '36px Stick No Bills'
      c.fillStyle = this.craft.mColor
      textY = this.y
      c.textBaseline = 'middle'
    }
    else {
      c.fillStyle = 'white'   
      c.strokeStyle = 'black'
      this.text = this.username
      c.font = '12px Zen Dots'
    }
    c.lineCap = "round";
    c.lineJoin = "round";
    
    c.lineWidth = 3
    

    c.strokeText(this.text, textX, textY)
    c.fillText(this.text, textX, textY)    
    c.restore()
  }

  draw() {
    if (!this.isDead) {
      if (this.thrusterOutput > 0) {
        this.thruster.x = this.x      
        this.thruster.angle = this.moveAngle + Math.PI / 2 
        this.thruster.drawnHeight = 10 + 5 * this.thrusterOutput
        this.thruster.y = this.y
        this.thruster.draw()
      } 
      c.globalAlpha = this.opacity
      c.beginPath()
      c.fillStyle = this.craft.mColor
      c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
      c.fill()  
      c.beginPath()        
      c.fillStyle = this.gradient;
      c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
      c.fill()      
      
    }
    
  }  

  
  
}