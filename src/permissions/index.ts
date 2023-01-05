import {
  requestBackgroundPermissionsAsync,
  requestForegroundPermissionsAsync,
} from 'expo-location'

export async function requestLocationPermissions() {
  const { status: foregroundStatus } = await requestForegroundPermissionsAsync()
  if (foregroundStatus !== 'granted') {
    return false
  }
  const { status: backgroundStatus } = await requestBackgroundPermissionsAsync()
  if (backgroundStatus !== 'granted') {
    return false
  }
  return true
}
