const friction = 0.98
class Particle {
  constructor({x, y, radius, color, velocity, rand, alpha =1}) {
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
    this.velocity = velocity    
    this.alpha = alpha
    this.clockWise = true
    this.startAngle = Math.atan2(velocity.y,velocity.x)
    this.endAngle = this.startAngle + rand * Math.PI / 3 + Math.PI / 9
    const middleAngle = (this.endAngle - this.startAngle) / 2
    this.startAngle -= middleAngle
    this.endAngle -= middleAngle
    this.bounceY = false
    this.bounceX = false
    this.boundingBox = this.getBoundingBox()
    if (this.boundingBox.left < 0) {
      this.x -= this.boundingBox.left - 1
    }
    if (this.boundingBox.right >= canvas.width) {
      this.x = canvas.width-this.boundingBox.width
    }
    if (this.boundingBox.top < 0) {
      this.y -= this.boundingBox.top - 1
    }
    if (this.boundingBox.bottom >= canvas.height) {
      this.y = canvas.height - this.boundingBox.height
    }
    
    
  }
  draw() {
    c.save()
    c.globalAlpha = this.alpha    
    c.beginPath()
    c.moveTo(this.x, this.y)
    c.arc(this.x, this.y, this.radius, this.startAngle, this.endAngle, this.clockwise)
    c.lineTo(this.x, this.y)
    c.closePath()
    c.fillStyle = this.color
    c.fill()
    c.restore()
  }

  update() {
    this.draw()
    this.velocity.x *= friction
    this.velocity.y *= friction
    this.x = this.x + this.velocity.x
    this.y = this.y + this.velocity.y
    this.boundingBox.left += this.velocity.x
    this.boundingBox.right += this.velocity.x
    this.boundingBox.top += this.velocity.y
    this.boundingBox.bottom += this.velocity.y
    this.alpha -= (0.008 / friction)    
    
    if (this.boundingBox.left < 0 || this.boundingBox.right > canvas.width) {
      this.velocity.x *= -1
      
    }
    if (this.boundingBox.top < 0 || this.boundingBox.bottom > canvas.height) {
      this.velocity.y *= -1
    }
    
  }

  getBoundingBox() {
    const x1 = this.x + this.radius * Math.cos(this.startAngle)
    const y1 = this.y + this.radius * Math.sin(this.startAngle)
    const x2 = this.x + this.radius * Math.cos(this.endAngle)
    const y2 = this.y + this.radius * Math.sin(this.endAngle)

    const left = Math.min(this.x, x1, x2)
    const top = Math.min(this.y, y1, y2)
    const right = Math.max(this.x, x1, x2)
    const bottom = Math.max(this.y, y1, y2)
    const width = right-left
    const height = bottom-top

    return {
      left,
      top,
      right,
      bottom,
      width,
      height
    }
  }
}
