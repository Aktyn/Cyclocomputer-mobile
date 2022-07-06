import { useEffect, useState } from 'react'
import * as Location from 'expo-location'
import { distanceBetweenEarthCoordinatesInKm, pick } from '../utils'

export function useGPS() {
  const [granted, setGranted] = useState(false)
  const [coordinates, setCoordinates] = useState({
    latitude: 0,
    longitude: 0,
    heading: 0,
    altitude: -Number.MAX_SAFE_INTEGER,
    slope: 0,
    speed: 0,
  })

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null

    Location.requestForegroundPermissionsAsync().then(
      (foregroundPermission) => {
        // console.log('foregroundPermission', foregroundPermission)
        if (!foregroundPermission.granted) {
          return
        }
        setGranted(true)

        Location.watchPositionAsync(
          {
            //TODO: allow user to change this within options view
            accuracy: Location.Accuracy.Highest, //High, Highest, BestForNavigation
            // distanceInterval: 10,
            // timeInterval: 2000,
          },
          (location) => {
            // console.log(location)
            setCoordinates((previous) => {
              let slope = 0

              if (previous.altitude !== -Number.MAX_SAFE_INTEGER) {
                const verticalDistance =
                  (location.coords.altitude ?? 0) - previous.altitude
                const horizontalDistance =
                  distanceBetweenEarthCoordinatesInKm(
                    location.coords.latitude,
                    location.coords.longitude,
                    previous.latitude,
                    previous.longitude,
                  ) * 1000

                //TODO: linearly weighted average of last few slope measurements
                slope = Math.atan2(verticalDistance, horizontalDistance)
              }

              return {
                slope,
                heading: location.coords.heading ?? 0,
                altitude: location.coords.altitude ?? 0,
                speed: location.coords.speed ?? 0,
                ...pick(location.coords, 'latitude', 'longitude'),
              }
            })
          },
        ).then((subscription) => {
          locationSubscription = subscription
        })
      },
    )

    return () => {
      locationSubscription?.remove()
    }
  }, [])

  return { granted, coordinates }
}
