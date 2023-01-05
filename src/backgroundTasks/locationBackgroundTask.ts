import type { LocationObject } from 'expo-location'
import * as TaskManager from 'expo-task-manager'

export const LOCATION_TASK_NAME = 'background-location-task'

TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    // eslint-disable-next-line no-console
    console.error(error)
    return
  }
  if (data) {
    const { locations } = data as { locations: LocationObject[] }

    const location = locations[0]

    if (location) {
      console.log('location:', location)
      // Core.instance.gps.updateLocation(location)
    }
  }
})
