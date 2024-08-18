class Projectile {
  constructor({x, y, radius,craft, color='white', willHit, speed, velocity, angle, id}) {
    this.x = x
    this.y = y
    this.willHit = willHit
    this.radius = radius
    this.craft = craft
    this.color = color
    this.strokeColor = this.invertHexColor(this.color)
    this.velocity = velocity
    this.speed = speed
    this.angle = angle
    //this.splashSprite = smlHitSprite.clone()
    //this.splashSprite.image = imageMap.get(hitImages[this.craft.hitType])
    this.bAngle = 0;
    this.hasRicocheted = false
    this.distanceTraveled = 0;    
    this.maxDistance = window.canvasDiag*0.92;
    this.maxDamage = 24;
    this.distanceRatio = 0;
    this.ricochetPens = 0;
    this.damage = this.maxDamage;
    this.id = id
    this.isSpent = false;
    this.opacity = 1
  }

  invertColor(r, g, b) {
    return {
      r: 255 - r,
      g: 255 - g,
      b: 255 - b
    };
  }

  hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255
    };
  }

  rgbToHex(r, g, b) {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  invertHexColor(hex) {
    const { r, g, b } = this.hexToRgb(hex);
    const invertedColor = this.invertColor(r, g, b);
    return this.rgbToHex(invertedColor.r, invertedColor.g, invertedColor.b);
  }

  draw() {
    c.save()
    c.beginPath()
    c.arc(this.x - Math.cos(this.angle) * 3, this.y - Math.sin(this.angle) * 3, this.radius*0.8, 0, Math.PI * 2, false)
    c.fillStyle = this.craft.sColor   
    c.fill()
    c.fillStyle = this.gradient
    c.closePath()
    c.fill()
    c.beginPath()
    c.shadowBlur = 4 + 2 * this.distanceRatio
    c.shadowColor = this.craft.sColor
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
    c.fillStyle = this.craft.mColor
    c.fill()
    c.fillStyle = this.gradient
    c.fill()
    c.closePath()    
    c.beginPath()
    c.arc(this.x - Math.cos(this.angle) * 6, this.y - Math.sin(this.angle) * 6, this.radius*0.5, 0, Math.PI * 2, false)
    c.fillStyle = this.craft.sColor   
    c.fill()
    c.fillStyle = this.gradient
    c.closePath()
    c.fill()
    c.beginPath()
    c.arc(this.x - Math.cos(this.angle) * 8, this.y - Math.sin(this.angle) * 8, this.radius*0.3, 0, Math.PI * 2, false)
    c.fillStyle = this.craft.sColor   
    c.fill()
    c.fillStyle = this.gradient
    c.closePath()
    c.fill()
    c.restore()
    
  }

  drawHitSprite(text) {
    if (this.opacity > 0) {
      c.globalAlpha = this.opacity
      let fontSize = 30 * (this.damage / this.maxDamage)
      if (fontSize<18) fontSize = 18
      c.font = `600 ${fontSize}px Stick No Bills`
      c.textAlign = 'center'
      c.textBaseline='middle'
      c.fillStyle = `hsla(360, 100%, ${Math.min(100,40/(this.damage/this.maxDamage))}%, 1)`
      c.strokeStyle = 'black'
      c.lineWidth = 3
      c.strokeText(String(text), this.x, this.y)
      c.fillText(String(text), this.x, this.y)
    }
  }

  update() {
    this.gradient = c.createRadialGradient(
      this.x + (this.radius) * Math.cos(this.bAngle),
      this.y + (this.radius) * Math.sin(this.bAngle), this.radius,
      this.x + (2 * this.radius) * Math.cos(this.bAngle),
      this.y + (2 * this.radius) * Math.sin(this.bAngle), 1.5* this.radius)
    this.gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Shine effect at the start
    this.gradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.8)'); // Shine effect at the start
    this.gradient.addColorStop(0.8, this.craft.mColor);               // Your color in the middle
    this.gradient.addColorStop(0.85, 'rgba(32, 33, 33, 0.1)');                 // Slightly darker at the end
    this.gradient.addColorStop(0.92, 'rgba(32, 33, 33, 0.2)');                 // Slightly darker at the end
    this.gradient.addColorStop(1, 'rgba(32, 33, 33, 0.3)');  
    if (!this.isSpent) {
    this.distanceTraveled += this.speed
    this.distanceRatio = Math.min(1,this.distanceTraveled/this.maxDistance)
    this.damage = Math.round(Math.max(this.maxDamage / 8, this.maxDamage *
      (1 - 0.7 * this.distanceRatio - 0.2 * this.ricochetPens)))
      if (this.distanceTraveled >= this.maxDistance) {
        let id = this.id
        this.isSpent = true
        SOCKET.emit('spentProjectile', { id })
      }
    }
    //this.trail.x = this.x
    //this.trail.y = this.y
    //if (this.hasRicocheted) {      
    //  this.hasRicocheted = false
    //  this.angle = Math.atan2(this.velocity.y, this.velocity.x)
    //}
    this.draw()
  }
  
}