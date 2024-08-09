class BgImage {
	constructor({
		x, y, z,
		src,
		scrlSpd,
		minFreq,
		freqRange
	})

	{
		this.img = new Image()
		this.img.src = src
		this.img.onerror = function () {
			console.error(`Failed to load the image ${src}`);}		
		this.left = x
		this.top = y
		this.z = z
		this.minFreq = minFreq
		this.freqRange = freqRange
		this.scrlSpd = scrlSpd
		this.img.onload = () => {
			
			this.width = this.img.width
			this.height = this.img.height
			console.log(this.left, this.top, this.src, this.width, this.height, scrlSpd)
		}
		this.right = this.x+this.width
		this.bottom = this.x+this.height
	}
	
	draw() {
		b.drawImage(this.img, this.left, this.top, this.width, this.height)

	}
	
}
