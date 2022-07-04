import { useCallback, useEffect, useState } from 'react'
import DeviceInfo from 'react-native-device-info'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import DomSelector from 'react-native-dom-parser'
import { useSettings } from '../settings'
import { useSnackbar } from '../snackbar/Snackbar'
import { convertLatLongToTile, float } from '../utils'
import { gpxContentMock } from './gpxContentMock'

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

export function useTour() {
  const { openSnackbar } = useSnackbar()
  const { settings } = useSettings()

  const [tour, setTour] = useState<ClusteredTour>(new Map())

  const parseGpxContent = useCallback(
    (gpxContent: string) => {
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

        const tilePos = convertLatLongToTile(
          latitude,
          longitude,
          settings.mapZoom,
        )
        const point = {
          index,
          latitude,
          longitude,
          tilePos,
        }
        index++
        const maxI = 2 ** settings.mapZoom
        const tileKey = `${Math.floor(tilePos.x) % maxI}-${
          Math.floor(tilePos.y) % maxI
        }`
        const cluster = clusteredPoints.get(tileKey) ?? []
        cluster.push(point)

        clusteredPoints.set(tileKey, cluster)
      }
      setTour(clusteredPoints)
    },
    [settings.mapZoom],
  )

  useEffect(() => {
    DeviceInfo.isEmulator().then((emulator) => {
      if (emulator) {
        parseGpxContent(gpxContentMock)
      } else {
        if (!settings.gpxFile?.uri) {
          setTour(new Map())
          return
        }
        fetch(settings.gpxFile.uri)
          .then((res) => res.text())
          .then(parseGpxContent)
          .catch((error) => {
            setTour(new Map())
            openSnackbar({
              message: error instanceof Error ? error.message : String(error),
            })
          })
      }
    })
  }, [openSnackbar, parseGpxContent, settings.gpxFile?.uri])

  return tour
}
