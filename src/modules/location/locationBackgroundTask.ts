import type { LocationObject } from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import { locationModule } from '.'
import { Config } from '../../config'

TaskManager.defineTask(Config.locationTaskName, ({ data, error }) => {
  // eslint-disable-next-line no-console
  console.log('test:', !!data, !!error)

  if (error) {
    console.error(error)
    return
  }
  if (data) {
    const { locations } = data as { locations: LocationObject[] }

    // if (Array.isArray(locations)) {
    //   locations.forEach(locationModule.updateLocation)
    // }

    const location = locations[0]

    if (location) {
      locationModule.updateLocation(location)
    }
  }
})
