import { useEffect, useState } from 'react'
import { core } from '../core'
import type { Coordinates } from '../core/gps'

export function useGPS() {
  const [granted, setGranted] = useState(core.gps.isGranted())
  const [coordinates, setCoordinates] = useState(core.gps.getCoordinates())

  useEffect(() => {
    const handleGrantedToggle = (isGranted: boolean) => setGranted(isGranted)
    const handleCoordinatesUpdate = (coords: Coordinates) =>
      setCoordinates(coords)

    core.gps.on('toggleGranted', handleGrantedToggle)
    core.gps.on('coordinatesUpdate', handleCoordinatesUpdate)

    return () => {
      core.gps.off('toggleGranted', handleGrantedToggle)
      core.gps.off('coordinatesUpdate', handleCoordinatesUpdate)
    }
  }, [])

  return { granted, coordinates }
}
