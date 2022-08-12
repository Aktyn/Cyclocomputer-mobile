import EventEmitter from 'events'
import type { DocumentResult } from 'expo-document-picker'
import DeviceInfo from 'react-native-device-info'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import DomSelector from 'react-native-dom-parser'
import { gpxContentMock } from '../mock/gpxContentMock'
import {
  convertLatLongToTile,
  distanceBetweenEarthCoordinatesInKm,
  dotProduct,
  float,
  last,
  normalizeVector,
  rotateVector,
} from '../utils'
import type { Coordinates } from './gps'

interface GeoPoint {
  index: number
  latitude: number
  longitude: number
  tilePos: {
    x: number
    y: number
  }
  timestamp: number
}

interface DrivingDirection {
  /** Distance to next turn (meters) */
  distance: number
  /** Angle of next turn (Value equal to Math.PI means that user is moving in another direction than the tour) */
  turnAngle: number
}

export type TileKey = `${number}-${number}`
export type ClusteredTour = Map<TileKey, GeoPoint[]>

const TURN_ANGLE_THRESHOLD = (Math.PI / 180) * 20 //degrees
const POINTS_DISTANCE_THRESHOLD = 50 //meters
const STRAIGHT_LINE_DISTANCE_THRESHOLD = 10 // meters

// Reduce points to keep all angles above threshold
function reducePointsByAngle(pts: GeoPoint[]) {
  if (pts.length < 3) {
    return [...pts]
  }
  const reduced = [pts[0]]
  for (let i = 1; i < pts.length - 1; i++) {
    const vec1 = [
      pts[i].longitude - pts[i - 1].longitude,
      pts[i].latitude - pts[i - 1].latitude,
    ] as const
    const vec2 = [
      pts[i + 1].longitude - pts[i].longitude,
      pts[i + 1].latitude - pts[i].latitude,
    ] as const

    const angle = Math.acos(
      dotProduct(normalizeVector(vec1), normalizeVector(vec2)),
    )
    if (angle > TURN_ANGLE_THRESHOLD) {
      reduced.push(pts[i])
    }
  }
  reduced.push(last(pts) as GeoPoint)
  return reduced
}

function reducePointsByDistance(pts: GeoPoint[]) {
  if (pts.length < 3) {
    return [...pts]
  }
  const reduced = [pts[0]]

  for (let i = 1; i < pts.length - 1; i++) {
    if (
      distanceBetweenEarthCoordinatesInKm(
        last(reduced)?.latitude ?? 0,
        last(reduced)?.longitude ?? 0,
        pts[i].latitude,
        pts[i].longitude,
      ) *
        1000 <
      POINTS_DISTANCE_THRESHOLD
    ) {
      // Average the two points
      const point = reduced[reduced.length - 1]
      point.longitude = (point.longitude + pts[i].longitude) / 2
      point.latitude = (point.latitude + pts[i].latitude) / 2

      continue
    }
    reduced.push(pts[i])
  }

  reduced.push(last(pts) as GeoPoint)
  return reduced
}

declare interface TourEventEmitter {
  on(
    event: 'tourUpdate',
    listener: (tour: ClusteredTour, zoom: number) => void,
  ): this
  off(
    event: 'tourUpdate',
    listener: (tour: ClusteredTour, zoom: number) => void,
  ): this
  emit(event: 'tourUpdate', tour: ClusteredTour, zoom: number): boolean
}

class TourEventEmitter extends EventEmitter {}

export class Tour extends TourEventEmitter {
  private gpxFileUri: string | undefined = undefined
  private mapZoom = 0
  private tour: ClusteredTour = new Map()
  private rawTour: GeoPoint[] = []

  private previousCoords: Coordinates | null = null
  private closestPointIndex = 0

  constructor() {
    super()
  }

  destroy() {
    super.removeAllListeners()
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
          this.rawTour = []
          this.emit('tourUpdate', this.tour, this.mapZoom)
          return
        }
        return fetch(this.gpxFileUri)
          .then((res) => res.text())
          .then((content) => this.parseGpxContent(content))
          .catch((error) => {
            this.tour = new Map()
            this.rawTour = []
            this.emit('tourUpdate', this.tour, this.mapZoom)
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
    this.rawTour = []
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

      let timestamp = 0
      try {
        timestamp = new Date(
          trkpt.getElementsByTagName('time')?.[0]?.children[0]?.text,
        ).getTime()
      } catch (e) {}

      const point = {
        index,
        latitude,
        longitude,
        tilePos,
        timestamp,
      }
      index++
      const maxI = 2 ** this.mapZoom
      const tileKey = `${Math.floor(tilePos.x) % maxI}-${
        Math.floor(tilePos.y) % maxI
      }` as const
      const cluster = clusteredPoints.get(tileKey) ?? []
      cluster.push(point)
      this.rawTour.push(point)

      clusteredPoints.set(tileKey, cluster)
    }
    this.tour = clusteredPoints
    this.rawTour.sort((a, b) => a.timestamp - b.timestamp) //ASC
    this.reduceRawTour()
    this.emit('tourUpdate', this.tour, this.mapZoom)
  }

  private reduceRawTour() {
    let points = this.rawTour.map((tour) => ({
      ...tour,
      tilePos: { ...tour.tilePos },
    }))

    // eslint-disable-next-line no-console
    console.log('Raw tour points:', points.length)
    points = reducePointsByDistance(points)
    // eslint-disable-next-line no-console
    console.log('Raw tour points after reduced by distance:', points.length)
    points = reducePointsByAngle(points)
    // eslint-disable-next-line no-console
    console.log('Raw tour points after reduced by angle:', points.length)

    this.rawTour = points
  }

  /** Second point is always further than first point */
  private findTwoClosestPointsIndex(coords: Coordinates): number[] {
    const index = this.closestPointIndex
    let closestDistanceToPoint = distanceBetweenEarthCoordinatesInKm(
      coords.latitude,
      coords.longitude,
      this.rawTour[index].latitude,
      this.rawTour[index].longitude,
    )

    for (let i = index - 1; i >= 0; i--) {
      const distance = distanceBetweenEarthCoordinatesInKm(
        coords.latitude,
        coords.longitude,
        this.rawTour[i].latitude,
        this.rawTour[i].longitude,
      )
      if (distance < closestDistanceToPoint) {
        closestDistanceToPoint = distance
        this.closestPointIndex = i
      }
    }
    for (let i = index + 1; i < this.rawTour.length; i++) {
      const distance = distanceBetweenEarthCoordinatesInKm(
        coords.latitude,
        coords.longitude,
        this.rawTour[i].latitude,
        this.rawTour[i].longitude,
      )
      if (distance < closestDistanceToPoint) {
        closestDistanceToPoint = distance
        this.closestPointIndex = i
      }
    }

    if (this.closestPointIndex === this.rawTour.length - 1) {
      return [this.closestPointIndex, this.closestPointIndex - 1]
    }
    if (this.closestPointIndex === 0) {
      return [this.closestPointIndex, this.closestPointIndex + 1]
    }

    const closestPointVector = [
      coords.longitude - this.rawTour[this.closestPointIndex].longitude,
      coords.latitude - this.rawTour[this.closestPointIndex].latitude,
    ] as const
    const nextPointVector = [
      this.rawTour[this.closestPointIndex + 1].longitude - coords.longitude,
      this.rawTour[this.closestPointIndex + 1].latitude - coords.latitude,
    ] as const
    const previousPointVector = [
      this.rawTour[this.closestPointIndex - 1].longitude - coords.longitude,
      this.rawTour[this.closestPointIndex - 1].latitude - coords.latitude,
    ] as const

    if (dotProduct(closestPointVector, nextPointVector) > 0) {
      return [this.closestPointIndex, this.closestPointIndex + 1]
    }
    if (dotProduct(closestPointVector, previousPointVector) > 0) {
      return [this.closestPointIndex, this.closestPointIndex - 1]
    }

    return [this.closestPointIndex]
  }

  generateDrivingDirections(coords: Coordinates): DrivingDirection | null {
    if (!this.previousCoords || this.rawTour.length < 3) {
      this.previousCoords = coords
      return null
    }

    const pointIndexes = this.findTwoClosestPointsIndex(coords).sort(
      (a, b) => b - a,
    )

    if (
      pointIndexes.length === 2 &&
      distanceBetweenEarthCoordinatesInKm(
        this.rawTour[pointIndexes[0]].latitude,
        this.rawTour[pointIndexes[0]].longitude,
        this.rawTour[pointIndexes[1]].latitude,
        this.rawTour[pointIndexes[1]].longitude,
      ) *
        1000 >
        STRAIGHT_LINE_DISTANCE_THRESHOLD &&
      pointIndexes[0] < this.rawTour.length - 1
    ) {
      //TODO: calculate closest distance to found segment to determine whether user is in close proximity to the tour

      const nextSegmentDistance =
        distanceBetweenEarthCoordinatesInKm(
          coords.longitude,
          coords.latitude,
          this.rawTour[pointIndexes[0]].longitude,
          this.rawTour[pointIndexes[0]].latitude,
        ) * 1000

      const directionVector = [
        coords.longitude - this.previousCoords.longitude,
        coords.latitude - this.previousCoords.latitude,
      ] as const
      const currentSegmentVector = [
        this.rawTour[pointIndexes[0]].longitude -
          this.rawTour[pointIndexes[1]].longitude,
        this.rawTour[pointIndexes[0]].latitude -
          this.rawTour[pointIndexes[1]].latitude,
      ] as const
      const directionDotProduct = dotProduct(
        directionVector,
        currentSegmentVector,
      )
      if (directionDotProduct < 0) {
        this.previousCoords = coords
        return {
          distance: nextSegmentDistance,
          turnAngle: Math.PI,
        }
      }

      const nextSegmentVector = [
        this.rawTour[pointIndexes[0] + 1].longitude -
          this.rawTour[pointIndexes[0]].longitude,
        this.rawTour[pointIndexes[0] + 1].latitude -
          this.rawTour[pointIndexes[0]].latitude,
      ] as const

      const normalizedCurrentSegment = normalizeVector(currentSegmentVector)
      const normalizedNextSegment = normalizeVector(nextSegmentVector)

      let angle = Math.acos(
        dotProduct(normalizedCurrentSegment, normalizedNextSegment),
      )

      if (
        dotProduct(
          rotateVector(normalizedCurrentSegment, angle),
          normalizedNextSegment,
        ) <
        1 - 1e-4
      ) {
        angle = -angle
      }

      return {
        distance: nextSegmentDistance,
        turnAngle: angle,
      }
    }

    this.previousCoords = coords
    return null
  }
}
