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
  private _coords: LocationObject['coords'] | null = null

  get coords() {
    return this._coords
  }

  public static async defineTask(restart = false) {
    if (TaskManager.isTaskDefined(Config.locationTaskName)) {
      if (restart) {
        await TaskManager.unregisterTaskAsync(Config.locationTaskName)
      } else {
        return
      }
    }
    // eslint-disable-next-line no-console
    console.log('Defining location task')
    TaskManager.defineTask(Config.locationTaskName, ({ data, error }) => {
      if (error) {
        console.error(error)
        return
      }
      if (data) {
        const { locations } = data as { locations: LocationObject[] }

        if (Array.isArray(locations) && locations.length > 0) {
          const newestLocation = locations.sort(
            (a, b) => b.timestamp - a.timestamp,
          )[0]
          locationModule.updateLocation(newestLocation)
        }
      }
    })
  }

  public async startMonitoring(): SafePromise {
    await LocationModule.defineTask(true)

    const gpsAccuracy = Accuracy.BestForNavigation
    const gpsTimeInterval = 200
    const gpsDistanceSensitivity = 1

    // eslint-disable-next-line no-console
    console.log('Requesting location permissions')
    const errorCode = await requestLocationPermissions()
    if (errorCode !== ErrorCode.NoError) {
      return errorCode
    }
    // eslint-disable-next-line no-console
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
      if (!TaskManager.isTaskDefined(Config.locationTaskName)) {
        return ErrorCode.BackgroundTaskNotDefined
      }
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
        },
      })
      // eslint-disable-next-line no-console
      console.log('Location updates started')
    } catch (error) {
      console.error(error)
      return ErrorCode.CannotStartBackgroundLocationUpdates
    }

    return ErrorCode.NoError
  }

  /**  This method should only be called from the background task */
  public updateLocation(location: LocationObject) {
    this._coords = location.coords
    this.emitter.emit('locationUpdate', location)
  }
}

LocationModule.defineTask().catch(console.error)
export const locationModule = new LocationModule()
