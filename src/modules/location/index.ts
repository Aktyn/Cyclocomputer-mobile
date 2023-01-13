import {
  Accuracy,
  hasStartedLocationUpdatesAsync,
  startLocationUpdatesAsync,
  stopLocationUpdatesAsync,
  type LocationObject,
} from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import { Config } from '../../config'
import type { SafePromise } from '../../utils'
import { ErrorCode } from '../../utils'
import { Module } from '../Module'
import { requestLocationPermissions } from './permissions'

class LocationModule extends Module<
  [(name: 'locationUpdate', location: LocationObject) => void]
> {
  private static defineTask() {
    if (TaskManager.isTaskDefined(Config.locationTaskName)) {
      return
    }
    // eslint-disable-next-line no-console
    console.log('Defining location task')
    TaskManager.defineTask(Config.locationTaskName, ({ data, error }) => {
      console.log('test:', !!data, !!error)

      if (error) {
        console.error(error)
        return
      }
      if (data) {
        const { locations } = data as { locations: LocationObject[] }

        if (Array.isArray(locations)) {
          locations.forEach((location) =>
            locationModule.updateLocation(location),
          )
        }
      }
    })
  }

  public async startMonitoring(): SafePromise {
    LocationModule.defineTask()

    const gpsAccuracy = Accuracy.BestForNavigation
    const gpsTimeInterval = 500
    const gpsDistanceSensitivity = 5

    console.log('Requesting location permissions')
    const errorCode = await requestLocationPermissions()
    if (errorCode !== ErrorCode.NoError) {
      return errorCode
    }
    console.log('Location permissions granted')
    try {
      if (await hasStartedLocationUpdatesAsync(Config.locationTaskName)) {
        // eslint-disable-next-line no-console
        console.log('Stopping location updates')
        await stopLocationUpdatesAsync(Config.locationTaskName)
      }
    } catch (error) {
      console.error(error)
    }
    try {
      // eslint-disable-next-line no-console
      console.log('Starting location updates')
      await startLocationUpdatesAsync(Config.locationTaskName, {
        accuracy: gpsAccuracy,
        timeInterval: gpsTimeInterval,
        deferredUpdatesInterval: gpsTimeInterval,
        distanceInterval: gpsDistanceSensitivity,
        deferredUpdatesDistance: gpsDistanceSensitivity,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Cyclocomputer',
          notificationBody: 'Location is being tracked in the background',
          // killServiceOnDestroy: true,
        },
      })
    } catch (error) {
      console.error(error)
      return ErrorCode.CannotStartBackgroundLocationUpdates
    }

    return ErrorCode.NoError
  }

  /**  This method should only be called from the background task */
  public updateLocation(location: LocationObject) {
    this.emitter.emit('locationUpdate', location)
  }
}

export const locationModule = new LocationModule()
