import { useCallback, useEffect, useState } from 'react'
import DeviceInfo from 'react-native-device-info'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import DomSelector from 'react-native-dom-parser'
import { useSettings } from '../settings'
import { useSnackbar } from '../snackbar/Snackbar'
import { float } from '../utils'
import { gpxContentMock } from './gpxContentMock'

export interface GeoPoint {
  latitude: number
  longitude: number
}

export function useTour() {
  const { openSnackbar } = useSnackbar()
  const { settings } = useSettings()

  const [tour, setTour] = useState<GeoPoint[] | null>(null)

  const parseGpxContent = useCallback((gpxContent: string) => {
    const gpxDOM = DomSelector(
      gpxContent
        .split(/\r*\n/)
        .join('')
        .match(/<trk>(.*)<\/trk>/gi)?.[0] ?? '',
    )
    const trkptArray = gpxDOM.getElementsByTagName('trkpt')
    const points: { latitude: number; longitude: number }[] = []
    for (const trkpt of trkptArray) {
      if (
        trkpt.tagName !== 'trkpt' ||
        !trkpt.attributes.lat ||
        !trkpt.attributes.lon
      ) {
        continue
      }
      points.push({
        latitude: float(trkpt.attributes.lat),
        longitude: float(trkpt.attributes.lon),
      })
    }
    setTour(points)
  }, [])

  useEffect(() => {
    DeviceInfo.isEmulator().then((emulator) => {
      if (emulator) {
        parseGpxContent(gpxContentMock)
      } else {
        if (!settings.gpxFile?.uri) {
          setTour(null)
          return
        }
        fetch(settings.gpxFile.uri)
          .then((res) => res.text())
          .then(parseGpxContent)
          .catch((error) => {
            setTour(null)
            openSnackbar({
              message: error instanceof Error ? error.message : String(error),
            })
          })
      }
    })
  }, [openSnackbar, parseGpxContent, settings.gpxFile?.uri])

  return tour
}
