import EventEmitter from 'events'
import * as Location from 'expo-location'
import type { LocationObject } from 'expo-location'
import { distanceBetweenEarthCoordinatesInKm, pick } from '../utils'
import { requestBackgroundLocationPermissions } from './common'
import type { SettingsSchema } from './settings'

export type Coordinates = {
  timestamp: number
  latitude: number
  longitude: number
  /** The altitude in meters above the WGS 84 reference ellipsoid */
  altitude: number
  /** Horizontal direction of travel of this device, measured in degrees starting at due north and continuing clockwise around the compass. Thus, north is 0 degrees, east is 90 degrees, south is 180 degrees, and so on. */
  heading: number
  /** Meters per second */
  speed: number
  slope: number
}

declare interface GPSEventEmitter {
  on(event: 'toggleGranted', listener: (granted: boolean) => void): this
  on(
    event: 'coordinatesUpdate',
    listener: (coordinates: Coordinates) => void,
  ): this

  off(event: 'toggleGranted', listener: (granted: boolean) => void): this
  off(
    event: 'coordinatesUpdate',
    listener: (coordinates: Coordinates) => void,
  ): this

  emit(event: 'toggleGranted', granted: boolean): boolean
  emit(event: 'coordinatesUpdate', coordinates: Coordinates): boolean
}

class GPSEventEmitter extends EventEmitter {}

export class GPS extends GPSEventEmitter {
  private granted = false
  private coordinates: Coordinates = {
    timestamp: 0,
    latitude: 0,
    longitude: 0,
    heading: 0,
    altitude: -Number.MAX_SAFE_INTEGER,
    slope: 0,
    speed: 0,
  }
  locationObservingOptions: {
    accuracy: number
    gpsTimeInterval: number
    gpsDistanceSensitivity: number
  } | null = null

  constructor() {
    super()

    this.init().catch((error) =>
      // eslint-disable-next-line no-console
      console.error(
        `Error while getting location permissions: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ),
    )
  }

  destroy() {
    this.stopObservingLocation()
  }

  isGranted() {
    return this.granted
  }

  getCoordinates() {
    return this.coordinates
  }

  private async init() {
    await requestBackgroundLocationPermissions()

    const foregroundPermission =
      await Location.requestForegroundPermissionsAsync()
    if (!foregroundPermission.granted) {
      return
    }

    const backgroundPermission = await Location.getBackgroundPermissionsAsync()
    if (!backgroundPermission.granted) {
      return
    }

    this.granted = true
    this.emit('toggleGranted', this.granted)
  }

  /** Should be called only from TaskManager */
  updateLocation(location: LocationObject) {
    let slope = 0

    if (this.coordinates.altitude !== -Number.MAX_SAFE_INTEGER) {
      const verticalDistance =
        (location.coords.altitude ?? 0) - this.coordinates.altitude
      const horizontalDistance =
        distanceBetweenEarthCoordinatesInKm(
          location.coords.latitude,
          location.coords.longitude,
          this.coordinates.latitude,
          this.coordinates.longitude,
        ) * 1000

      slope = (Math.atan2(verticalDistance, horizontalDistance) * 180) / Math.PI
    }

    this.coordinates = {
      timestamp: location.timestamp,
      slope,
      heading: location.coords.heading ?? 0,
      altitude: location.coords.altitude ?? 0,
      speed: location.coords.speed ?? 0,
      ...pick(location.coords, 'latitude', 'longitude'),
    }
    this.emit('coordinatesUpdate', this.coordinates)
  }

  startObservingLocation(settings: SettingsSchema) {
    const accuracy = settings.gpsAccuracy
    const gpsTimeInterval = settings.gpsTimeInterval
    const gpsDistanceSensitivity = settings.gpsDistanceSensitivity

    this.locationObservingOptions = {
      accuracy,
      gpsTimeInterval,
      gpsDistanceSensitivity,
    }
    return Location.startLocationUpdatesAsync('BACKGROUND_LOCATION_TASK', {
      accuracy,
      timeInterval: gpsTimeInterval,
      deferredUpdatesInterval: gpsTimeInterval,
      distanceInterval: gpsDistanceSensitivity,
      deferredUpdatesDistance: gpsDistanceSensitivity,

      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Location',
        notificationBody: 'Location tracking in background',
        notificationColor: '#fff',
      },
    })
  }

  async stopObservingLocation() {
    try {
      this.locationObservingOptions = null
      await Location.stopLocationUpdatesAsync('BACKGROUND_LOCATION_TASK')
    } catch (e) {}
  }
}
