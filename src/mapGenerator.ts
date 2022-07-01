import assert from 'assert'
import { PixelRatio } from 'react-native'
import Canvas, { CanvasRenderingContext2D, Image } from 'react-native-canvas'
import { clamp } from './utils'

const TILE_RESOLUTION = 256 //openstreetmap tile resolution

const scalar = 1e14
const pixelRatio = PixelRatio.getPixelSizeForLayoutSize(scalar) / scalar

interface ImageCache {
  image: Image
  loaded: boolean
  tileX: number
  tileY: number
  loadListeners: ((cache: ImageCache) => void)[]
}

//Converts latitude, longitude, zoom to tile coordinates
function convertLatLongToTile(
  latitude: number,
  longitude: number,
  zoom: number,
) {
  const lat_rad = (latitude / 180) * Math.PI
  const n = 2 ** zoom
  return {
    x: ((longitude + 180.0) / 360.0) * n,
    y: ((1.0 - Math.asinh(Math.tan(lat_rad)) / Math.PI) / 2.0) * n,
  }
}

export class MapGenerator {
  static OUTPUT_RESOLUTION = 128

  private readonly canvasResolution: number
  private readonly relativeTileResolution: number
  private readonly canvas: Canvas
  private readonly ctx: CanvasRenderingContext2D
  private readonly zoom: number
  private readonly positionIndicatorRadius = 4

  private imagesCache = new Map<string, ImageCache>()

  constructor(canvas: Canvas, zoom = 16) {
    this.canvasResolution = PixelRatio.roundToNearestPixel(
      MapGenerator.OUTPUT_RESOLUTION / pixelRatio,
    )
    this.relativeTileResolution = PixelRatio.roundToNearestPixel(
      TILE_RESOLUTION / pixelRatio,
    )

    this.canvas = canvas
    this.canvas.width = this.canvasResolution
    this.canvas.height = this.canvasResolution
    this.zoom = zoom

    this.ctx = canvas.getContext('2d')
    this.ctx.fillStyle = '#fff'
    this.ctx.fillRect(0, 0, this.canvasResolution, this.canvasResolution)
  }

  private fetchTile(x: number, y: number) {
    const key = `${x}-${y}`
    let imageCache = this.imagesCache.get(key) ?? null
    if (imageCache) {
      if (imageCache.loaded) {
        return Promise.resolve(imageCache)
      }

      return new Promise<ImageCache>((resolve) => {
        assert(imageCache)
        imageCache.loadListeners.push(resolve)
      })
    }

    const image = new Image(this.canvas)
    image.crossOrigin = `Anonymous`

    imageCache = {
      image,
      loaded: false,
      tileX: x,
      tileY: y,
      loadListeners: [],
    }
    this.imagesCache.set(key, imageCache)

    return new Promise<ImageCache>((resolve) => {
      assert(imageCache)
      imageCache.loadListeners.push(resolve)

      // image.src = `https://b.tile.thunderforest.com/cycle/${this.zoom}/${x}/${y}.png?apikey=${THUNDERFOREST_API_KEY}`
      image.src = `https://a.tile.openstreetmap.org/${this.zoom}/${x}/${y}.png`
      image.addEventListener('load', () => {
        assert(imageCache)
        imageCache.loaded = true
        imageCache.loadListeners.forEach((listener) => {
          assert(imageCache)
          listener(imageCache)
        })
        imageCache.loadListeners = []
      })
    })
  }

  private drawPositionIndicator() {
    this.ctx.fillStyle = '#fff'
    this.ctx.strokeStyle = '#000'
    this.ctx.lineWidth = 4 / pixelRatio
    this.ctx.beginPath()
    this.ctx.arc(
      this.canvasResolution / 2,
      this.canvasResolution / 2,
      this.positionIndicatorRadius / pixelRatio,
      0,
      2 * Math.PI,
    )
    this.ctx.stroke()
    this.ctx.fill()
  }

  async update(latitude: number, longitude: number, rotation = 0) {
    const tilePosition = convertLatLongToTile(latitude, longitude, this.zoom)

    const maxI = 2 ** this.zoom
    const x = Math.floor(tilePosition.x)
    const y = Math.floor(tilePosition.y)

    const tileOffsetX = clamp(tilePosition.x - x, 0, 1)
    const tileOffsetY = clamp(tilePosition.y - y, 0, 1)

    this.ctx.save()
    this.ctx.translate(this.canvasResolution / 2, this.canvasResolution / 2)
    this.ctx.rotate(rotation)
    this.ctx.translate(
      -(this.canvasResolution / 2),
      -(this.canvasResolution / 2),
    )

    const relevantKeys = new Set<string>()

    //TODO: Consider situation when there is temporarily no internet access. Knowing route, all tiles on it could be preloaded and cached.
    //isOnRoute(tileX, tileY)

    const tilesGridRadius = 1
    const r = tilesGridRadius + 1
    for (let xx = -r; xx <= r; xx++) {
      for (let yy = -r; yy <= r; yy++) {
        const key = `${x + xx}-${y + yy}`
        relevantKeys.add(key)
        //Just preload edge images
        if (
          xx < -tilesGridRadius ||
          xx > tilesGridRadius ||
          yy < -tilesGridRadius ||
          yy > tilesGridRadius
        ) {
          if (!this.imagesCache.has(key)) {
            await this.fetchTile(x + xx, y + yy)
          }
          continue
        }

        const imageCache = await this.fetchTile(
          (x + xx) % maxI,
          (y + yy) % maxI,
        )
        const image = imageCache.image

        if (
          image.width === TILE_RESOLUTION &&
          image.height === TILE_RESOLUTION
        ) {
          this.ctx.drawImage(
            image,
            this.canvasResolution / 2 -
              tileOffsetX * this.relativeTileResolution +
              (imageCache.tileX - x) * this.relativeTileResolution,
            this.canvasResolution / 2 -
              tileOffsetY * this.relativeTileResolution +
              (imageCache.tileY - y) * this.relativeTileResolution,
            this.relativeTileResolution,
            this.relativeTileResolution,
          )
        }
      }
    }
    this.drawPositionIndicator()

    this.ctx.restore()

    //Cleanup
    for (const key of this.imagesCache.keys()) {
      if (!relevantKeys.has(key)) {
        this.imagesCache.delete(key)
      }
    }

    //TEST
    const relativeSize = PixelRatio.getPixelSizeForLayoutSize(
      this.canvasResolution,
    )
    if (relativeSize !== MapGenerator.OUTPUT_RESOLUTION) {
      throw new Error(
        `Relative size is ${relativeSize} but it must be ${MapGenerator.OUTPUT_RESOLUTION}`,
      )
    }
    return this.ctx
      .getImageData(0, 0, relativeSize, relativeSize)
      .then((imageData) => imageData.data)
  }
}
