interface ImageLike {
  width: number
  height: number
  channels: number
  data: Uint8Array | Uint8ClampedArray | Uint16Array
}

export class CustomCanvas {
  readonly data: Uint8Array | Uint8ClampedArray

  private readonly width: number
  private readonly height: number
  private readonly channels: number

  private rotation = 0

  constructor(width: number, height: number, channels = 4) {
    this.data = new Uint8Array(width * height * channels)
    this.width = width
    this.height = height
    this.channels = channels
  }

  setRotation(radians: number) {
    this.rotation = radians
  }

  rotateAroundCenter(x: number, y: number): [number, number] {
    const centerX = this.width / 2
    const centerY = this.height / 2

    const relativeX = x - centerX
    const relativeY = y - centerY
    const angle = Math.atan2(relativeY, relativeX) + this.rotation
    const len = Math.sqrt(relativeX ** 2 + relativeY ** 2)
    const pxRot = Math.cos(angle) * len
    const pyRot = Math.sin(angle) * len

    return [pxRot + centerX, pyRot + centerY]
  }

  drawImage(image: ImageLike, x: number, y: number) {
    this.data.fill(128) //!TEMP

    const [x1, y1] = this.rotateAroundCenter(x, y)
    const [x2, y2] = this.rotateAroundCenter(x + image.width, y)
    const [x3, y3] = this.rotateAroundCenter(
      x + image.width - 1,
      y + image.height - 1,
    )
    const [x4, y4] = this.rotateAroundCenter(x, y + image.height - 1)

    const left = Math.max(0, Math.round(Math.min(x1, x2, x3, x4)))
    const top = Math.max(0, Math.round(Math.min(y1, y2, y3, y4)))
    const right = Math.min(this.width - 1, Math.round(Math.max(x1, x2, x3, x4)))
    const bottom = Math.min(
      this.height - 1,
      Math.round(Math.max(y1, y2, y3, y4)),
    )

    for (let py = top; py <= bottom; py++) {
      for (let px = left; px <= right; px++) {
        const index = (px + py * this.width) * this.channels

        const [pxRot, pyRot] = this.rotateAroundCenter(px, py)

        const imageX = Math.round(pxRot - x)
        const imageY = Math.round(pyRot - y)
        if (
          imageX < 0 ||
          imageY < 0 ||
          imageX >= image.width ||
          imageY >= image.height
        ) {
          continue
        }
        const tileImageIndex = (imageX + imageY * image.width) * image.channels

        for (let i = 0; i < this.channels; i++) {
          this.data[index + i] =
            i < image.channels ? image.data[tileImageIndex + i] : 255
        }
      }
    }
  }
}
