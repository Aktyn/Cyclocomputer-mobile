import { Buffer } from '@craftzdog/react-native-buffer'
import type { DecodedPng } from 'fast-png'
import { decode } from 'fast-png'
import { PixelRatio } from 'react-native'
import type { ClusteredTour } from './core/tour'
import { CustomCanvas } from './customCanvas'
import { convertLatLongToTile } from './utils'

const TILE_RESOLUTION = 256 //openstreetmap tile resolution

const scalar = 1e14
export const pixelRatio = PixelRatio.getPixelSizeForLayoutSize(scalar) / scalar

const positionCursorRadius = 5

class Tile {
  private image: DecodedPng | null = null

  constructor(url: string) {
    fetch(url, { method: 'GET' })
      .then((res) => res.blob())
      .then((blob) => {
        const reader = new FileReader()
        reader.addEventListener('loadend', () => {
          const byteData = Buffer.from(
            (reader.result as string).substring(
              'data:application/octet-stream;base64,'.length,
            ),
            'base64',
          )

          const image = decode(byteData.buffer)
          if (
            image.width !== TILE_RESOLUTION ||
            image.height !== TILE_RESOLUTION
          ) {
            // eslint-disable-next-line no-console
            console.error('Invalid tile resolution')
            return
          }
          this.image = image
        })
        reader.readAsDataURL(blob)
      })
      .catch((error) =>
        // eslint-disable-next-line no-console
        console.error(
          `Error: ${error instanceof Error ? error.message : error}`,
        ),
      )
  }

  get loaded() {
    return !!this.image
  }

  getImage() {
    return this.image
  }
}

export class MapGeneratorV2 {
  static OUTPUT_RESOLUTION = 128

  private static tilesCache = new Map<string, Tile>()

  readonly zoom: number

  //TODO: use Uint8Array
  private readonly canvas = new CustomCanvas(
    MapGeneratorV2.OUTPUT_RESOLUTION,
    MapGeneratorV2.OUTPUT_RESOLUTION,
    1, // Grayscale output with will be anyway converted to black and white monoHLSB
  )

  constructor(zoom = 16) {
    this.zoom = zoom
  }

  getData() {
    return this.canvas.data
  }

  private fetchTile(x: number, y: number) {
    const key = `${x}-${y}`
    const tileCache = MapGeneratorV2.tilesCache.get(key)
    if (tileCache) {
      return tileCache
    }

    const tileURL = `http://stamen-tiles-c.a.ssl.fastly.net/toner/${this.zoom}/${x}/${y}.png`

    const tile = new Tile(tileURL)
    MapGeneratorV2.tilesCache.set(key, tile)

    return tile
  }

  private drawPointer() {
    this.canvas.setFillColor([0x00])
    this.canvas.drawCircle(64, 64, positionCursorRadius)
    this.canvas.setFillColor([0xff])
    this.canvas.drawCircle(64, 64, positionCursorRadius - 2)
    this.canvas.setFillColor([0x00])
    this.canvas.drawCircle(64, 64, 1)
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
    type GeoPoint = (ClusteredTour extends Map<string, infer P>
      ? P
      : Array<unknown>)[number]
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

        const key = `${tileX}-${tileY}` //NOTE: must match key format used in useTour
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
          this.canvas.width / 2 + diffX * TILE_RESOLUTION,
          this.canvas.height / 2 + diffY * TILE_RESOLUTION,
        ]

        if (prev) {
          //TODO: try drawing path of textured circles (it may be faster)
          this.canvas.drawLine(prev[0], prev[1], point[0], point[1], 3)
        }

        prev = point
      }
      this.canvas.toggleTextureFill(false)
    }

    this.drawPointer()

    //TODO: preload all tiles on tour and prevent from clearing them
    //Cleanup
    for (const key of MapGeneratorV2.tilesCache.keys()) {
      if (!relevantKeys.has(key)) {
        MapGeneratorV2.tilesCache.delete(key)
      }
    }
  }
}
