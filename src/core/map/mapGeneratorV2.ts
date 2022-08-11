import { PixelRatio } from 'react-native'
import { convertLatLongToTile } from '../../utils'
import type { ClusteredTour, TileKey } from '../tour'
import { CustomCanvas } from './customCanvas'
import { Tile } from './tile'

const scalar = 1e14
export const pixelRatio = PixelRatio.getPixelSizeForLayoutSize(scalar) / scalar

const positionCursorRadius = 6

type GeoPoint = (ClusteredTour extends Map<string, infer P>
  ? P
  : Array<unknown>)[number]

export class MapGeneratorV2 {
  static OUTPUT_RESOLUTION = 128

  private static tilesCache = new Map<TileKey, Tile>()

  readonly zoom: number

  private readonly canvas = new CustomCanvas(
    MapGeneratorV2.OUTPUT_RESOLUTION,
    MapGeneratorV2.OUTPUT_RESOLUTION,
    1, // Grayscale output with will be anyway converted to black and white monoHLSB
  )

  constructor(zoom = 16) {
    this.zoom = Math.round(zoom)

    //Remove tiles cached with different zoom
    for (const tileKey of MapGeneratorV2.tilesCache.keys()) {
      if (MapGeneratorV2.tilesCache.get(tileKey)?.zoom !== this.zoom) {
        MapGeneratorV2.tilesCache.delete(tileKey)
      }
    }
  }

  get data() {
    return this.canvas.data
  }

  static preloadTourTiles(tour: ClusteredTour, zoom: number) {
    const maxI = 2 ** zoom
    for (const [tileKey, points] of tour) {
      if (MapGeneratorV2.tilesCache.has(tileKey) || !points.length) {
        continue
      }

      const x = Math.floor(points[0].tilePos.x) % maxI
      const y = Math.floor(points[0].tilePos.y) % maxI

      const tileURL = `http://stamen-tiles-c.a.ssl.fastly.net/toner/${zoom}/${x}/${y}.png`

      const tile = new Tile(tileURL, zoom)
      MapGeneratorV2.tilesCache.set(tileKey, tile)
    }
  }

  private fetchTile(x: number, y: number) {
    const key = `${Math.floor(x)}-${Math.floor(y)}` as const
    const tileCache = MapGeneratorV2.tilesCache.get(key)
    if (tileCache && tileCache.zoom === this.zoom) {
      return tileCache
    }

    const tileURL = `http://stamen-tiles-c.a.ssl.fastly.net/toner/${this.zoom}/${x}/${y}.png`

    const tile = new Tile(tileURL, this.zoom)
    MapGeneratorV2.tilesCache.set(key, tile)

    return tile
  }

  private drawTourPath(
    tourPoints: GeoPoint[],
    tilePosition: { x: number; y: number },
  ) {
    if (tourPoints.length > 1) {
      tourPoints.sort((p1, p2) => p1.index - p2.index)
      // console.log('tour points:', tourPoints.length)

      this.canvas.toggleTextureFill(true)

      let prev: [number, number] | null = null
      for (const {
        tilePos: { x: tourPointX, y: tourPointY },
      } of tourPoints) {
        const diffX = tourPointX - tilePosition.x
        const diffY = tourPointY - tilePosition.y
        // console.log(`{diffX: ${diffX}, diffY: ${diffY}, index: ${index}},`)

        const point: [number, number] = [
          this.canvas.width / 2 + diffX * Tile.RESOLUTION,
          this.canvas.height / 2 + diffY * Tile.RESOLUTION,
        ]

        if (prev) {
          this.canvas.drawLine(prev[0], prev[1], point[0], point[1], 2)
        }

        prev = point
      }
      this.canvas.toggleTextureFill(false)
    }
  }

  private drawPointer() {
    this.canvas.setFillColor([0x00])
    this.canvas.drawCircle(64, 64, positionCursorRadius)
    this.canvas.setFillColor([0xff])
    this.canvas.drawCircle(64, 64, positionCursorRadius - 2)
    this.canvas.setFillColor([0x00])
    this.canvas.drawCircle(64, 64, 2)
  }

  update(
    latitude: number,
    longitude: number,
    rotation: number,
    tour: ClusteredTour,
  ) {
    const tilePosition = convertLatLongToTile(latitude, longitude, this.zoom)
    this.canvas.setRotation(rotation)
    this.canvas.setTranslation(0, (this.canvas.height / 2) * 0.618)

    const relevantKeys = new Set<string>()
    const tourPoints: GeoPoint[] = []

    const maxI = 2 ** this.zoom
    const x = Math.floor(tilePosition.x) % maxI
    const y = Math.floor(tilePosition.y) % maxI

    const tilesGridRadius = 1
    const r = tilesGridRadius + 1
    for (let xx = -r; xx <= r; xx++) {
      for (let yy = -r; yy <= r; yy++) {
        const tileX = (x + xx) % maxI
        const tileY = (y + yy) % maxI

        const key = `${tileX}-${tileY}` as const //NOTE: must match key format used in useTour
        relevantKeys.add(key)
        //Just preload edge images
        if (
          xx < -tilesGridRadius ||
          xx > tilesGridRadius ||
          yy < -tilesGridRadius ||
          yy > tilesGridRadius
        ) {
          if (!MapGeneratorV2.tilesCache.has(key)) {
            this.fetchTile(tileX, tileY)
          }
          continue
        }

        const tile = this.fetchTile(tileX, tileY)

        const offsetX = tilePosition.x - tileX
        const offsetY = tilePosition.y - tileY

        const tileImage = tile.getImage()
        if (tileImage) {
          const tilePosX = Math.round(
            this.canvas.width / 2 - offsetX * tileImage.width,
          )
          const tilePosY = Math.round(
            this.canvas.height / 2 - offsetY * tileImage.height,
          )
          this.canvas.drawImage(tileImage, tilePosX, tilePosY)
        }

        //Extract points from tour cluster
        if (tour.has(key)) {
          tourPoints.push(...(tour.get(key) as GeoPoint[]))
        }
      }
    }

    this.drawTourPath(tourPoints, tilePosition)
    this.drawPointer()

    //Cleanup
    for (const key of MapGeneratorV2.tilesCache.keys()) {
      if (!relevantKeys.has(key) && !tour.has(key)) {
        MapGeneratorV2.tilesCache.delete(key)
      }
    }

    // console.log('Cached tiles:', MapGeneratorV2.tilesCache.size)
  }
}
