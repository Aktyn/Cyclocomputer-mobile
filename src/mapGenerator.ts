import assert from 'assert'
import { PixelRatio } from 'react-native'
import type { CanvasRenderingContext2D } from 'react-native-canvas'
import type Canvas from 'react-native-canvas'
import { Image } from 'react-native-canvas'
import type { ClusteredTour } from './core/tour'
import { clamp, convertLatLongToTile } from './utils'

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

export class MapGenerator {
  static OUTPUT_RESOLUTION = 128

  private readonly canvasResolution: number
  private readonly relativeTileResolution: number
  public readonly zoom: number
  public readonly canvas: Canvas
  private readonly ctx: CanvasRenderingContext2D
  private readonly positionIndicatorRadius = 5
  private readonly relativeSize: number

  private static imagesCache = new Map<string, ImageCache>()

  constructor(canvas: Canvas, zoom = 16) {
    this.canvasResolution = Math.round(
      PixelRatio.roundToNearestPixel(
        MapGenerator.OUTPUT_RESOLUTION / pixelRatio,
      ),
    )
    this.relativeTileResolution = PixelRatio.roundToNearestPixel(
      TILE_RESOLUTION / pixelRatio,
    )

    this.relativeSize = MapGenerator.OUTPUT_RESOLUTION
    if (this.relativeSize !== MapGenerator.OUTPUT_RESOLUTION) {
      throw new Error(
        `Relative size is ${this.relativeSize} but it must be ${MapGenerator.OUTPUT_RESOLUTION}`,
      )
    }

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
    let imageCache = MapGenerator.imagesCache.get(key) ?? null
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
    MapGenerator.imagesCache.set(key, imageCache)

    return new Promise<ImageCache>((resolve) => {
      assert(imageCache)
      imageCache.loadListeners.push(resolve)

      // image.src = `https://b.tile.thunderforest.com/cycle/${this.zoom}/${x}/${y}.png?apikey=${THUNDERFOREST_API_KEY}`
      // image.src = `https://a.tile.openstreetmap.org/${this.zoom}/${x}/${y}.png`
      image.src = `http://stamen-tiles-c.a.ssl.fastly.net/toner/${this.zoom}/${x}/${y}.png`
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

  private drawPointer(x: number, y: number, radius: number) {
    this.ctx.fillStyle = '#fff'
    this.ctx.strokeStyle = '#000'
    this.ctx.lineWidth = radius / pixelRatio
    this.ctx.beginPath()
    this.ctx.arc(
      this.canvasResolution / 2 + x,
      this.canvasResolution / 2 + y,
      radius / pixelRatio,
      0,
      2 * Math.PI,
    )
    this.ctx.stroke()
    this.ctx.fill()

    this.ctx.fillStyle = '#000'
    this.ctx.beginPath()
    this.ctx.arc(
      this.canvasResolution / 2 + x,
      this.canvasResolution / 2 + y,
      2 / pixelRatio,
      0,
      2 * Math.PI,
    )
    this.ctx.fill()
  }

  async update(
    latitude: number,
    longitude: number,
    rotation: number,
    tour: ClusteredTour,
  ) {
    const tilePosition = convertLatLongToTile(latitude, longitude, this.zoom)

    const maxI = 2 ** this.zoom
    const x = Math.floor(tilePosition.x)
    const y = Math.floor(tilePosition.y)

    const centerOffset = 0.25
    const centerOffsetX =
      Math.sin(rotation) * centerOffset * this.canvasResolution
    const centerOffsetY =
      Math.cos(rotation) * centerOffset * this.canvasResolution
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
    //edit: not it gets simpler as there is a ClusteredTour and each cluster corresponds to a distinct tile along the route

    type GeoPoint = (ClusteredTour extends Map<string, infer P>
      ? P
      : Array<unknown>)[number]
    const tourPoints: GeoPoint[] = []

    const tilesGridRadius = 1
    const r = tilesGridRadius + 1
    for (let xx = -r; xx <= r; xx++) {
      for (let yy = -r; yy <= r; yy++) {
        const key = `${(x + xx) % maxI}-${(y + yy) % maxI}` //NOTE: must match key format used in useTour
        relevantKeys.add(key)
        //Just preload edge images
        if (
          xx < -tilesGridRadius ||
          xx > tilesGridRadius ||
          yy < -tilesGridRadius ||
          yy > tilesGridRadius
        ) {
          if (!MapGenerator.imagesCache.has(key)) {
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
          try {
            this.ctx.drawImage(
              image,
              this.canvasResolution / 2 -
                tileOffsetX * this.relativeTileResolution +
                (imageCache.tileX - x) * this.relativeTileResolution +
                centerOffsetX,
              this.canvasResolution / 2 -
                tileOffsetY * this.relativeTileResolution +
                (imageCache.tileY - y) * this.relativeTileResolution +
                centerOffsetY,
              this.relativeTileResolution,
              this.relativeTileResolution,
            )
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e)
          }
        }

        //Extract points from tour cluster
        if (tour.has(key)) {
          tourPoints.push(...(tour.get(key) as GeoPoint[]))
        }
      }
    }

    if (tourPoints.length > 1) {
      tourPoints.sort((p1, p2) => p1.index - p2.index)
      // console.log(tourPoints.length)

      this.ctx.lineWidth = 1
      this.ctx.strokeStyle = '#55ffff'

      this.ctx.beginPath()
      for (const {
        tilePos: { x: tourPointX, y: tourPointY },
        // index,
      } of tourPoints) {
        const diffX = tourPointX - tilePosition.x
        const diffY = tourPointY - tilePosition.y
        // console.log(`{diffX: ${diffX}, diffY: ${diffY}, index: ${index}},`)
        this.ctx.lineTo(
          this.canvasResolution / 2 +
            diffX * this.canvasResolution * 2 +
            centerOffsetX,
          this.canvasResolution / 2 +
            diffY * this.canvasResolution * 2 +
            centerOffsetY,
        )
      }
      this.ctx.stroke()
    }

    this.drawPointer(centerOffsetX, centerOffsetY, this.positionIndicatorRadius)

    this.ctx.restore()

    //Cleanup
    for (const key of MapGenerator.imagesCache.keys()) {
      if (!relevantKeys.has(key)) {
        MapGenerator.imagesCache.delete(key)
      }
    }

    return await this.ctx
      .getImageData(0, 0, this.relativeSize, this.relativeSize)
      .then((imageData) => imageData.data)
  }
}
