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

  private readonly zoom: number

  //TODO: use Uint8Array
  private readonly canvas: CustomCanvas

  constructor(zoom = 16) {
    this.zoom = zoom
    this.canvas = new CustomCanvas(
      MapGeneratorV2.OUTPUT_RESOLUTION,
      MapGeneratorV2.OUTPUT_RESOLUTION,
      1, // Grayscale output with will be anyway converted to black and white monoHLSB
    )
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

  update(
    latitude: number,
    longitude: number,
    rotation: number,
    _tour: ClusteredTour,
  ) {
    const tilePosition = convertLatLongToTile(latitude, longitude, this.zoom)
    this.canvas.setRotation(rotation)

    const maxI = 2 ** this.zoom
    const x = Math.floor(tilePosition.x)
    const y = Math.floor(tilePosition.y)

    const tile = this.fetchTile(
      // (x + xx) % maxI,
      x % maxI,
      // (y + yy) % maxI,
      y % maxI,
    )

    const tileImage = tile.getImage()
    if (tileImage) {
      this.canvas.drawImage(tileImage, -64, -64)
    }
  }
}
