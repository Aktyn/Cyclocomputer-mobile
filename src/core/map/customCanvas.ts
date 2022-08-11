import { clamp } from '../../utils'

export interface ImageLike {
  width: number
  height: number
  channels: number
  data: Uint8Array | Uint8ClampedArray | Uint16Array
}

export class CustomCanvas {
  readonly data: Uint8Array | Uint8ClampedArray

  readonly width: number
  readonly height: number
  private readonly channels: number

  private rotation = 0
  private translation = { x: 0, y: 0 }
  private fillColor: number[]
  private textureFill = false

  constructor(width: number, height: number, channels = 4) {
    this.data = new Uint8Array(width * height * channels)
    this.data.fill(0xff)
    this.width = width
    this.height = height
    this.channels = channels
    this.fillColor = new Array(channels).fill(255) as never
  }

  setRotation(radians: number) {
    this.rotation = radians
  }

  setTranslation(x: number, y: number) {
    this.translation.x = x
    this.translation.y = y
  }

  setFillColor(color: number[]) {
    if (color.length !== this.channels) {
      throw new Error(
        `Color must have ${this.channels} channel${
          this.channels === 1 ? '' : 's'
        }`,
      )
    }
    this.fillColor = color
  }

  toggleTextureFill(enable: boolean) {
    this.textureFill = enable
  }

  rotateAroundCenter(x: number, y: number, reverse = false): [number, number] {
    if (this.rotation === 0) {
      return [x, y]
    }

    const centerX = this.width / 2 + this.translation.x
    const centerY = this.height / 2 + this.translation.y

    const relativeX = x - centerX
    const relativeY = y - centerY
    const angle =
      Math.atan2(relativeY, relativeX) +
      (reverse ? -this.rotation : this.rotation)
    const len = Math.sqrt(relativeX ** 2 + relativeY ** 2)
    const pxRot = Math.cos(angle) * len
    const pyRot = Math.sin(angle) * len

    return [pxRot + centerX, pyRot + centerY]
  }

  drawImage(image: ImageLike, x: number, y: number) {
    x += this.translation.x
    y += this.translation.y

    const [x1, y1] = this.rotateAroundCenter(x, y)
    const [x2, y2] = this.rotateAroundCenter(x + image.width - 1, y)
    const [x3, y3] = this.rotateAroundCenter(
      x + image.width - 1,
      y + image.height - 1,
    )
    const [x4, y4] = this.rotateAroundCenter(x, y + image.height - 1)

    const left = Math.max(0, Math.floor(Math.min(x1, x2, x3, x4)))
    const top = Math.max(0, Math.floor(Math.min(y1, y2, y3, y4)))
    const right = Math.min(this.width - 1, Math.ceil(Math.max(x1, x2, x3, x4)))
    const bottom = Math.min(
      this.height - 1,
      Math.ceil(Math.max(y1, y2, y3, y4)),
    )

    // for (let py = 0; py <= this.height - 1; py++) {
    // for (let px = 0; px <= this.width - 1; px++) {
    for (let py = top; py <= bottom; py++) {
      for (let px = left; px <= right; px++) {
        const index = (px + py * this.width) * this.channels

        const [pxRot, pyRot] = this.rotateAroundCenter(px, py, true)

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

  drawCircle(centerX: number, centerY: number, radius: number) {
    centerX = Math.round(centerX + this.translation.x)
    centerY = Math.round(centerY + this.translation.y)

    if (
      centerX + radius < 0 ||
      centerX - radius >= this.width ||
      centerY + radius < 0 ||
      centerY - radius >= this.height
    ) {
      return
    }

    for (let y = centerY - radius; y <= centerY + radius; y++) {
      for (let x = centerX - radius; x <= centerX + radius; x++) {
        const distance = (centerX - x) ** 2 + (centerY - y) ** 2
        if (distance < radius ** 2) {
          this.drawPixel(x, y, true)
        }
      }
    }
  }

  drawLine(x1: number, y1: number, x2: number, y2: number, thickness: number) {
    x1 += this.translation.x
    y1 += this.translation.y
    x2 += this.translation.x
    y2 += this.translation.y

    const [px1Rot, py1Rot] = this.rotateAroundCenter(x1, y1)
    const [px2Rot, py2Rot] = this.rotateAroundCenter(x2, y2)

    x1 = Math.round(px1Rot)
    y1 = Math.round(py1Rot)
    x2 = Math.round(px2Rot)
    y2 = Math.round(py2Rot)

    if (
      (x1 < 0 && x2 < 0) ||
      (x1 >= this.width && x2 >= this.width) ||
      (y1 < 0 && y2 < 0) ||
      (y1 >= this.height && y2 >= this.height)
    ) {
      return
    }

    if (thickness <= 1) {
      this.drawLineBresenham(x1, y1, x2, y2)
    } else if (Math.abs(y2 - y1) < Math.abs(x2 - x1)) {
      const wy = clamp(
        ((thickness - 1) *
          Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))) /
          Math.max(1, 2 * Math.abs(x2 - x1)),
        Math.round(thickness / 2),
        thickness,
      )
      for (let i = 0; i <= wy; i++) {
        this.drawLineBresenham(x1, y1 - i, x2, y2 - i)
        this.drawLineBresenham(x1, y1 + i, x2, y2 + i)
      }
    } else {
      const wx = clamp(
        ((thickness - 1) *
          Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))) /
          Math.max(1, 2 * Math.abs(y2 - y1)),
        Math.round(thickness / 2),
        thickness,
      )
      for (let i = 0; i <= wx; i++) {
        this.drawLineBresenham(x1 - i, y1, x2 - i, y2)
        this.drawLineBresenham(x1 + i, y1, x2 + i, y2)
      }
    }
  }

  private drawLineBresenham(x1: number, y1: number, x2: number, y2: number) {
    const dx = Math.abs(x2 - x1)
    const dy = Math.abs(y2 - y1)
    const xInc = x1 < x2 ? 1 : -1
    const yInc = y1 < y2 ? 1 : -1

    let x = x1
    let y = y1
    this.drawPixel(x, y, true)

    if (dx >= dy) {
      let e = 2 * dy - dx
      while (x !== x2) {
        if (e < 0) {
          e += 2 * dy
        } else {
          e += 2 * (dy - dx)
          y += yInc
        }
        x += xInc
        this.drawPixel(x, y, true)
      }
    } else {
      let e = 2 * dx - dy
      while (y !== y2) {
        if (e < 0) {
          e += 2 * dx
        } else {
          e += 2 * (dx - dy)
          x += xInc
        }
        y += yInc
        this.drawPixel(x, y, true)
      }
    }
  }

  drawPixel(x: number, y: number, ignoreRotation = false) {
    const [pxRot, pyRot] = this.rotateAroundCenter(x, y, false)

    const [x1, y1] = ignoreRotation
      ? [x, y]
      : [Math.round(pxRot), Math.round(pyRot)]

    if (x1 < 0 || x1 >= this.width || y1 < 0 || y1 >= this.height) {
      return
    }
    const index = (x1 + y1 * this.width) * this.channels
    for (let i = 0; i < this.channels; i++) {
      if (this.textureFill) {
        this.data[index + i] = (x1 + y1) % 2 === 0 ? 255 : 0
      } else {
        this.data[index + i] = this.fillColor[i]
      }
    }
  }
}
