import {
  requestBackgroundPermissionsAsync,
  requestForegroundPermissionsAsync,
} from 'expo-location'
import type { SafePromise } from '../../utils'
import { ErrorCode } from '../../utils'

export async function requestLocationPermissions(): SafePromise {
  try {
    const { status: foregroundStatus } =
      await requestForegroundPermissionsAsync()
    if (foregroundStatus !== 'granted') {
      return ErrorCode.ForegroundLocationPermissionDenied
    }
    const { status: backgroundStatus } =
      await requestBackgroundPermissionsAsync()
    if (backgroundStatus !== 'granted') {
      return ErrorCode.BackgroundLocationPermissionDenied
    }
    return ErrorCode.NoError
  } catch (error) {
    console.error(error)
    return ErrorCode.Unknown
  }
}
