import type { LocationObject } from 'expo-location'
import {
  Accuracy,
  hasStartedLocationUpdatesAsync,
  startLocationUpdatesAsync,
  stopLocationUpdatesAsync,
} from 'expo-location'
import { Config } from '../../config'
import type { SafePromise } from '../../utils'
import { ErrorCode } from '../../utils'
import { Module } from '../Module'
import { requestLocationPermissions } from './permissions'

class LocationModule extends Module<
  [(name: 'locationUpdate', location: LocationObject) => void]
> {
  public async startMonitoring(): SafePromise {
    const errorCode = await requestLocationPermissions()
    if (errorCode === ErrorCode.NoError) {
      try {
        if (await hasStartedLocationUpdatesAsync(Config.locationTaskName)) {
          await stopLocationUpdatesAsync(Config.locationTaskName)
        }
      } catch (error) {
        console.error(error)
      }
      try {
        await startLocationUpdatesAsync(Config.locationTaskName, {
          accuracy: Accuracy.BestForNavigation,
          showsBackgroundLocationIndicator: true,
          deferredUpdatesDistance: 5,
          deferredUpdatesInterval: 1000,
          foregroundService: {
            notificationTitle: 'Location tracking',
            notificationBody: 'Location is being tracked in the background',
            killServiceOnDestroy: true,
          },
        })
      } catch (error) {
        console.error(error)
        return ErrorCode.CannotStartBackgroundLocationUpdates
      }
    }
    return errorCode
  }

  /**  This method should only be called from the background task */
  public updateLocation(location: LocationObject) {
    this.emitter.emit('locationUpdate', location)
  }
}

export const locationModule = new LocationModule()
