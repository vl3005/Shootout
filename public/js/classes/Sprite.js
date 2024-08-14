class Sprite {
  constructor({image, x, y, frameCount, normX = 1, normY = 1, startFrame=0, looped = false, rotate = false, colorize = 0, OffsetX=0,OffsetY=0, width, height, rows = 1, cols = 1, drawnWidth, drawnHeight}) {
    this.image = image
    this.frameCount = frameCount;
    this.width = width;
    this.rand = 0;
    this.angle = 0;
    this.OffsetX = OffsetX
    this.OffsetY = OffsetY
    this.looped = looped
    this.height = height;
    this.normX = normX
    this.normY = normY
    this.startFrame = startFrame
    this.drawnHeight = drawnHeight
    this.drawnWidth = drawnWidth
    this.x = x + this.OffsetX - drawnWidth / 2;
    this.y = y + this.OffsetY - drawnHeight / 2;
    this.rows = rows;
    this.rotate = rotate
    this.cols = cols;
    this.finished = false;
    this.colorize = colorize
    this.currentFrame = startFrame;
  }

  draw() {
    const col = this.currentFrame % this.cols;
    const row = Math.floor(this.currentFrame / this.cols);
    const frameX = col * this.width;
    const frameY = row * this.height;
    
    c.save()    
    if (this.rotate) {
      c.translate(this.x, this.y);
      c.rotate(this.angle)      
      c.drawImage(
        this.image,
        frameX, frameY,
        this.width, this.height,
        this.OffsetX - this.drawnWidth / 2 * this.normX, this.OffsetY - this.drawnHeight / 2 * this.normY,
        this.drawnWidth, this.drawnHeight
      );
      if (this.colorize) {
        c.globalAlpha = 0.8
        c.globalCompositeOperation = 'source-atop'; // Ensures the color is applied only to the image
        c.fillStyle = this.colorize; // 
        c.fillRect(this.OffsetX - this.drawnWidth / 2, this.OffsetY - this.drawnHeight / 2, this.drawnWidth, this.drawnHeight);
        //c.fillRect(0,0, canvas.width, canvas.height);

        // Step 3: Reset the composite operation to default
        c.globalCompositeOperation = 'source-over'; // This is the default value
      }
    } else{
    c.drawImage(
      this.image,
      frameX, frameY,
      this.width, this.height,
      this.x + this.OffsetX - this.drawnWidth / 2, this.y + this.OffsetY - this.drawnHeight / 2,
      this.drawnWidth, this.drawnHeight
      );
      if (this.colorize) {
        c.globalAlpha = 0.8
        c.globalCompositeOperation = 'source-atop';  
        c.fillStyle = this.colorize; 
        c.fillRect(this.x + this.OffsetX - this.drawnWidth / 2, this.y + this.OffsetY - this.drawnHeight / 2, this.drawnWidth, this.drawnHeight);

        c.globalCompositeOperation = 'source-over';
      }
    }

    c.restore()

    this.currentFrame++;
    if (this.currentFrame >= this.frameCount) {
      if (!this.looped) {        
        this.finished = true; // Mark as finished if not looped
      }
      this.currentFrame=this.startFrame
    }
  }


  resetSprite(x, y, angle=0,colorize=0) {
    this.angle = angle
    this.currentFrame = this.startFrame
    this.colorize = colorize
    this.x = x //+ this.OffsetX //- this.drawnWidth / 2
    this.y = y //+ this.OffsetY //- this.drawnHeight / 2
    this.finished = false
  }

  clone() {
    // Create a new Sprite with the current properties
    return new Sprite({ image:this.image, x:this.x, y:this.y, frameCount:this.frameCount, startFrame:this.startFrame, looped:this.looped, rotate:this.rotate, OffsetX:this.OffsetX, OffsetY:this.OffsetY, width: this.width, height: this.height, rows:this.rows, cols: this.cols, drawnWidth: this.drawnWidth, drawnHeight: this.drawnHeight });
  }
}
const explosion = new Image()
explosion.src = '../../img/Effect_Explosion2_1_355x365.png'
explosion.onload = function () { console.log('Explosion loaded') }
const explSprite = new Sprite({image: explosion, x:0, y:0, frameCount:54, startFrame:2,looped: false, rotate:true,width: 355,height: 365,rows: 6,cols: 9,drawnWidth: 120,drawnHeight: 124})

const smallHitBlue = new Image()
smallHitBlue.src = '../../img/Effect_SmallHit_1_516x463_blue.png'
smallHitBlue.onload = function () { console.log('smallHit_blue loaded') }
const smallHitGreen = new Image()
smallHitGreen.src = '../../img/Effect_SmallHit_1_516x463_green.png'
smallHitGreen.onload = function () { console.log('smallHit_blue loaded') }
const smallHitYellow = new Image()
smallHitYellow.src = '../../img/Effect_SmallHit_1_516x463_yellow.png'
smallHitYellow.onload = function () { console.log('smallHit_yellow loaded') }
const smallHitRed = new Image()
smallHitRed.src = '../../img/Effect_SmallHit_1_516x463_red.png'
smallHitRed.onload = function () { console.log('smallHit_red loaded') }
const smallHitWhite = new Image()
smallHitWhite.src = '../../img/Effect_SmallHit_1_516x463_white.png'
smallHitWhite.onload = function () { console.log('smallHit_white loaded') }
const smlHitSprite = new Sprite({ image: smallHitBlue, x: 0, y: 0, frameCount: 29, startFrame: 2, looped: false, rotate: true, OffsetX: 13, width: 516, height: 463, rows: 7, cols: 9, drawnWidth: 89, drawnHeight: 80})

const impact = new Image()
impact.src = '../../img/Effect_Impact_1_305x383.png'
impact.onload = function () { console.log('impact loaded') }
const impSprite = new Sprite({ image: impact, x: 0, y: 0, frameCount: 29, startFrame: 1, looped: false, rotate: true, OffsetX: 0, OffsetY: 0, width: 305,height: 383,rows: 3,cols: 9,drawnWidth: 50,drawnHeight: 63})

const vortex = new Image()
vortex.src = '../../img/Effect_TheVortex_1_429x429.png'
vortex.onload = function () { console.log('vortex loaded') }
const vrtxSprite = new Sprite({ image: vortex, x: 0, y: 0, frameCount: 48, startFrame: 2, looped: false, rotate: false, width: 429, height: 429, rows: 6, cols: 9, drawnWidth: 120, drawnHeight: 120 })


const power = new Image()
power.src = '../../img/Effect_PowerChords_1_517x353.png'
power.onload = function () { console.log('pwrChrds loaded') }
const pwrSprite = new Sprite({ image: power, x: 0, y: 0, frameCount: 63, normY: 0, startFrame: 3, looped: true, OffsetY: 0, rotate: true, width: 517, height: 353, rows: 7, cols: 9, drawnWidth: 18, drawnHeight: 10 })

const worm = new Image()
worm.src = '../../img/Effect_Worm_1_421x369.png'
worm.onload = function () { console.log('worm loaded') }
const wrmSprite = new Sprite({ image: worm, x: 0, y: 0, frameCount: 63, normY: 0, startFrame: 3, looped: true, OffsetY: 0, rotate: true, width: 421, height: 369, rows: 7, cols: 9, drawnWidth: 18, drawnHeight: 10 })

const tentacles = new Image()
tentacles.src = '../../img/Effect_Tentacles_1_433x337.png'
tentacles.onload = function () { console.log('tenta loaded') }
const tntSprite = new Sprite({ image: tentacles, x: 0, y: 0, frameCount: 63, normY: 0, startFrame: 3, looped: true, OffsetY: 0, rotate: true, width: 433, height: 337, rows: 7, cols: 9, drawnWidth: 20, drawnHeight: 10 })

const trlSprites = [pwrSprite, wrmSprite, tntSprite]
const hitImages = [smallHitBlue, smallHitGreen, smallHitRed, smallHitYellow, smallHitWhite]