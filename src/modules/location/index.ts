import {
  hasStartedLocationUpdatesAsync,
  startLocationUpdatesAsync,
  stopLocationUpdatesAsync,
  type LocationObject,
} from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import { Config } from '../../config'
import type { SafePromise } from '../../utils'
import { ErrorCode } from '../../utils'
import { requestLocationPermissions } from '../../utils/permissions'
import { Module } from '../Module'
import type { SettingsSchema } from '../settings/index'
import { settingsModule } from '../settings/index'

class LocationModule extends Module<
  [(name: 'locationUpdate', location: LocationObject) => void]
> {
  private _coords: LocationObject['coords'] | null = null
  private preparedForMonitoring = false
  private isMonitoringActive = false

  private readonly onSingleSettingChange = (key: keyof SettingsSchema) => {
    if (!this.isMonitoringActive) {
      return
    }

    switch (key) {
      case 'gpsAccuracy':
      case 'gpsTimeInterval':
      case 'gpsDistanceSensitivity':
        this.startMonitoring(true)
        break
    }
  }

  get coords() {
    return this._coords
  }

  constructor() {
    super()
    settingsModule.emitter.on('singleSettingChange', this.onSingleSettingChange)
  }

  destroy() {
    settingsModule.emitter.off(
      'singleSettingChange',
      this.onSingleSettingChange,
    )
  }

  public static async defineTask(restart = false): SafePromise {
    if (TaskManager.isTaskDefined(Config.locationTaskName)) {
      if (restart) {
        try {
          await TaskManager.unregisterTaskAsync(Config.locationTaskName)
        } catch (error) {
          console.error(error)
        }
      } else {
        return ErrorCode.NoError
      }
    }
    try {
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
    } catch (error) {
      console.error(error)
      return ErrorCode.BackgroundTaskNotDefined
    }
    return ErrorCode.NoError
  }

  private async prepareForMonitoring(): SafePromise {
    const definingTaskErrorCode = await LocationModule.defineTask(true)
    if (definingTaskErrorCode !== ErrorCode.NoError) {
      return definingTaskErrorCode
    }

    const requestingPermissionsErrorCode = await requestLocationPermissions()
    if (requestingPermissionsErrorCode !== ErrorCode.NoError) {
      return requestingPermissionsErrorCode
    }

    return ErrorCode.NoError
  }

  public async startMonitoring(
    restart = false,
    settings = settingsModule.settings,
  ): SafePromise {
    if (!this.preparedForMonitoring) {
      const errorCode = await this.prepareForMonitoring()
      if (errorCode !== ErrorCode.NoError) {
        return errorCode
      }
      this.preparedForMonitoring = true
    }

    if (restart) {
      await this.stopMonitoring()
    } else if (await hasStartedLocationUpdatesAsync(Config.locationTaskName)) {
      return ErrorCode.NoError
    }

    try {
      const { gpsAccuracy, gpsTimeInterval, gpsDistanceSensitivity } = settings
      // eslint-disable-next-line no-console
      console.log('Starting location updates with given parameters:', {
        gpsAccuracy,
        gpsTimeInterval,
        gpsDistanceSensitivity,
      })
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
      this.isMonitoringActive = true
      // eslint-disable-next-line no-console
      console.log('Location updates started')
    } catch (error) {
      console.error(error)
      this.isMonitoringActive = false
      return ErrorCode.CannotStartBackgroundLocationUpdates
    }

    return ErrorCode.NoError
  }

  private async stopMonitoring(): SafePromise {
    try {
      if (await hasStartedLocationUpdatesAsync(Config.locationTaskName)) {
        // eslint-disable-next-line no-console
        console.log('Stopping location updates')
        await stopLocationUpdatesAsync(Config.locationTaskName)
      }
      this.isMonitoringActive = false
    } catch (error) {
      console.error(error)
      return ErrorCode.CannotStopBackgroundLocationUpdates
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
