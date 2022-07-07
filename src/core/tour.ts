import EventEmitter from 'events'
import type { DocumentResult } from 'expo-document-picker'
import DeviceInfo from 'react-native-device-info'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import DomSelector from 'react-native-dom-parser'
import { gpxContentMock } from '../mock/gpxContentMock'
import { convertLatLongToTile, float } from '../utils'

interface GeoPoint {
  index: number
  latitude: number
  longitude: number
  tilePos: {
    x: number
    y: number
  }
}

export type ClusteredTour = Map<string, GeoPoint[]>

declare interface TourEventEmitter {
  on(event: 'tourUpdate', listener: (tour: ClusteredTour) => void): this
  off(event: 'tourUpdate', listener: (tour: ClusteredTour) => void): this
  emit(event: 'tourUpdate', tour: ClusteredTour): boolean
}

class TourEventEmitter extends EventEmitter {}

export class Tour extends TourEventEmitter {
  private gpxFileUri: string | undefined = undefined
  private mapZoom = 0
  private tour: ClusteredTour = new Map()

  constructor() {
    super()
  }

  destroy() {
    //
  }

  getTour() {
    return this.tour
  }

  /** Should be called only from Core */
  async setSettings(
    gpxFile: (DocumentResult & { type: 'success' }) | null,
    mapZoom: number,
  ) {
    if (gpxFile?.uri === this.gpxFileUri && mapZoom === this.mapZoom) {
      return
    }
    this.gpxFileUri = gpxFile?.uri
    this.mapZoom = mapZoom

    await DeviceInfo.isEmulator().then((emulator) => {
      if (emulator) {
        this.parseGpxContent(gpxContentMock)
      } else {
        if (!this.gpxFileUri) {
          this.tour = new Map()
          this.emit('tourUpdate', this.tour)
          return
        }
        return fetch(this.gpxFileUri)
          .then((res) => res.text())
          .then((content) => this.parseGpxContent(content))
          .catch((error) => {
            this.tour = new Map()
            this.emit('tourUpdate', this.tour)
            // eslint-disable-next-line no-console
            console.error(
              error instanceof Error ? error.message : String(error),
            )
          })
      }
    })
  }

  private parseGpxContent(gpxContent: string) {
    const gpxDOM = DomSelector(
      gpxContent
        .split(/\r*\n/)
        .join('')
        .match(/<trk>(.*)<\/trk>/gi)?.[0] ?? '',
    )
    const trkptArray = gpxDOM.getElementsByTagName('trkpt')
    const clusteredPoints: ClusteredTour = new Map()
    let index = 0
    for (const trkpt of trkptArray) {
      if (
        trkpt.tagName !== 'trkpt' ||
        !trkpt.attributes.lat ||
        !trkpt.attributes.lon
      ) {
        continue
      }

      const latitude = float(trkpt.attributes.lat)
      const longitude = float(trkpt.attributes.lon)

      const tilePos = convertLatLongToTile(latitude, longitude, this.mapZoom)
      const point = {
        index,
        latitude,
        longitude,
        tilePos,
      }
      index++
      const maxI = 2 ** this.mapZoom
      const tileKey = `${Math.floor(tilePos.x) % maxI}-${
        Math.floor(tilePos.y) % maxI
      }`
      const cluster = clusteredPoints.get(tileKey) ?? []
      cluster.push(point)

      clusteredPoints.set(tileKey, cluster)
    }
    this.tour = clusteredPoints
    this.emit('tourUpdate', this.tour)
  }
}
