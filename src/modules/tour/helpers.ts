import DomSelector from 'react-native-dom-parser'
import uuid from 'react-native-uuid'
import {
  convertLatLongToTile,
  distanceBetweenEarthCoordinatesInKm,
  dotProduct,
  float,
  last,
  normalizeVector,
} from '../../utils'

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
export type TileKey = `${number}-${number}`
export type ClusteredTour = Map<TileKey, GeoPoint[]>

export interface Tour {
  id: string
  name: string
  raw: GeoPoint[]
  /** Derived from mapZoom from settings */
  clusterSize: number
  clustered: ClusteredTour
}

export function tourFromGpxContent(gpxContent: string, mapZoom: number): Tour {
  const gpxDOM = DomSelector(
    gpxContent
      .split(/\r*\n/)
      .join('')
      .match(/<trk>(.*)<\/trk>/gi)?.[0] ?? '',
  )
  const trkptArray = gpxDOM.getElementsByTagName('trkpt')

  const rawTour: GeoPoint[] = []
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
    const tilePos = convertLatLongToTile(latitude, longitude, mapZoom)

    let timestamp = 0
    try {
      timestamp = new Date(
        trkpt.getElementsByTagName('time')?.[0]?.children[0]?.text,
      ).getTime()
    } catch (e) {}

    rawTour.push({
      index,
      latitude,
      longitude,
      tilePos,
      timestamp,
    })

    index++
  }
  rawTour.sort((a, b) => a.timestamp - b.timestamp) //ASC

  const nameTag = gpxDOM.getElementsByTagName('name')

  const tour = {
    id: uuid.v4() as string,
    name:
      nameTag.length > 0
        ? decodeHtmlEntities(nameTag[0].children[0].text ?? 'Error')
        : `Tour ${uuid.v4()}`,
    raw: rawTour,
    clusterSize: mapZoom,
    clustered: new Map(),
  }
  return clusterTour(tour, mapZoom)
}

export function clusterTour(tour: Tour, mapZoom: number) {
  const clusteredPoints: ClusteredTour = new Map()

  for (const point of tour.raw) {
    const maxI = 2 ** mapZoom
    const tileKey = `${Math.floor(point.tilePos.x) % maxI}-${
      Math.floor(point.tilePos.y) % maxI
    }` as const

    const cluster = clusteredPoints.get(tileKey) ?? []
    cluster.push(point)

    clusteredPoints.set(tileKey, cluster)
  }

  tour.clustered = clusteredPoints
  return tour
}

function decodeHtmlEntities(str: string) {
  return str.replace(/&#([^;]+);/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex.replace(/^x/i, ''), 16))
  })
}

//TODO: rethink
function _reduceRawTour(rawTour: GeoPoint[]) {
  let points = rawTour.map((tour) => ({
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

  return points
}

const TURN_ANGLE_THRESHOLD = (Math.PI / 180) * 20 //degrees
const POINTS_DISTANCE_THRESHOLD = 50 //meters
// const STRAIGHT_LINE_DISTANCE_THRESHOLD = 10 // meters

/** Reduce points to keep all angles above threshold */
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
  reduced.push(last(pts))
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

  reduced.push(last(pts))
  return reduced
}
