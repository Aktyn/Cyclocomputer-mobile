import { useEffect, useState } from 'react'
import { Core } from '../core'
import type { Coordinates } from '../core/gps'

export function useGPS() {
  const [granted, setGranted] = useState(Core.instance.gps.isGranted())
  const [coordinates, setCoordinates] = useState(
    Core.instance.gps.getCoordinates(),
  )

  useEffect(() => {
    const handleGrantedToggle = (isGranted: boolean) => setGranted(isGranted)
    const handleCoordinatesUpdate = (coords: Coordinates) =>
      setCoordinates(coords)

    Core.instance.gps.on('toggleGranted', handleGrantedToggle)
    Core.instance.gps.on('coordinatesUpdate', handleCoordinatesUpdate)

    return () => {
      Core.instance.gps.off('toggleGranted', handleGrantedToggle)
      Core.instance.gps.off('coordinatesUpdate', handleCoordinatesUpdate)
    }
  }, [])

  return { granted, coordinates }
}
