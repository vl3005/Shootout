class Projectile {
  constructor({x, y, radius,craft, color='white', willHit, speed, velocity, angle, id}) {
    this.x = x
    this.y = y
    this.willHit = willHit
    this.radius = radius
    this.craft = craft
    this.color = color
    this.velocity = velocity
    this.speed = speed
    this.angle = angle
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
   
  draw() {
    c.save()
    c.beginPath()
    c.arc(this.x - Math.cos(this.angle) * 3, this.y - Math.sin(this.angle) * 3, this.radius*0.8, 0, Math.PI * 2, false)
    c.fillStyle = this.craft.sColor   
    c.fill()
    c.closePath()
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
    c.closePath()
    c.beginPath()
    c.arc(this.x - Math.cos(this.angle) * 8, this.y - Math.sin(this.angle) * 8, this.radius*0.3, 0, Math.PI * 2, false)
    c.fillStyle = this.craft.sColor   
    c.fill()
    c.closePath()
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
      this.x + (this.radius+3) * Math.cos(this.angle),
      this.y + (this.radius+3) * Math.sin(this.angle), 0.6*this.radius,
      this.x + (this.radius) * Math.cos(this.angle),
      this.y + (this.radius) * Math.sin(this.angle), 1.8*this.radius)
    this.gradient.addColorStop(0, `${this.craft.sColor}FF`); // Shine effect at the start
    this.gradient.addColorStop(0.15, `${this.craft.sColor}CF`); // Shine effect at the start
    this.gradient.addColorStop(0.89, this.craft.mColor);               // Your color in the middle
    this.gradient.addColorStop(0.9, 'rgba(32, 33, 33, 0.1)');                 // Slightly darker at the end
    this.gradient.addColorStop(0.95, 'rgba(32, 33, 33, 0.2)');                 // Slightly darker at the end
    this.gradient.addColorStop(1, 'rgba(32, 33, 33, 0.4)');  
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
    this.draw()
  }
  
}