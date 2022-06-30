import { useEffect, useState } from 'react'
import * as Location from 'expo-location'
import { pick } from '../utils'

export function useGPS() {
  const [granted, setGranted] = useState(false)
  const [coordinates, setCoordinates] = useState({
    latitude: 0,
    longitude: 0,
    heading: null as number | null,
  })

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null

    Location.requestForegroundPermissionsAsync().then(
      (foregroundPermission) => {
        console.log('foregroundPermission', foregroundPermission)
        if (!foregroundPermission.granted) {
          return
        }
        setGranted(true)

        Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High, //BestForNavigation
            distanceInterval: 10,
            timeInterval: 2000,
          },
          (location) => {
            console.log(location)
            setCoordinates(
              pick(location.coords, 'latitude', 'longitude', 'heading'),
            )
            //TODO: test location.altitude on mobile phone
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
