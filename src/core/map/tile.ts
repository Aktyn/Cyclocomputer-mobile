import { Buffer } from '@craftzdog/react-native-buffer'
import type { DecodedPng } from 'fast-png'
import { decode } from 'fast-png'

export class Tile {
  static readonly RESOLUTION = 256 //openstreetmap tile resolution

  private image: DecodedPng | null = null
  readonly zoom: number

  constructor(url: string, zoom: number) {
    this.zoom = zoom

    // console.log(`Loading tile: ${url}`)

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
            image.width !== Tile.RESOLUTION ||
            image.height !== Tile.RESOLUTION
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
