import type { LocationObject } from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import { locationModule } from '.'
import { Config } from '../../config'

TaskManager.defineTask(Config.locationTaskName, ({ data, error }) => {
  if (error) {
    console.error(error)
    return
  }
  if (data) {
    const { locations } = data as { locations: LocationObject[] }

    const location = locations[0]

    if (location) {
      locationModule.updateLocation(location)
    }
  }
})
