import type { LocationObject } from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import { Core } from '.'

TaskManager.defineTask(
  //NOTE: taskName is not put into exported variable to prevent circular imports
  'CYCLOCOMPUTER_BACKGROUND_LOCATION',
  async ({ data, error }: TaskManager.TaskManagerTaskBody) => {
    if (error) {
      // eslint-disable-next-line no-console
      console.error(error)
      return
    }
    if (data) {
      const { locations } = data as { locations: LocationObject[] }
      const location = locations[0]

      if (location) {
        Core.instance.gps.updateLocation(location)
      }
    }
  },
)
