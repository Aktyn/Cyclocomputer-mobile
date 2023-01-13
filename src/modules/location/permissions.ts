import {
  requestBackgroundPermissionsAsync,
  requestForegroundPermissionsAsync,
} from 'expo-location'
import {
  PermissionsAndroid,
  type Permission,
  type Rationale,
} from 'react-native'
import type { SafePromise } from '../../utils'
import { ErrorCode } from '../../utils'

async function requestPermission(
  permission: Permission,
  rationale: Partial<Rationale>,
): SafePromise {
  try {
    const granted = await PermissionsAndroid.request(permission, {
      title: 'Permission',
      message: 'Permission is required',
      buttonNeutral: 'Ask Me Later',
      buttonNegative: 'Cancel',
      buttonPositive: 'OK',
      ...rationale,
    })
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      return ErrorCode.NoError
    } else {
      return ErrorCode.PermissionDenied
    }
  } catch {
    return ErrorCode.PermissionDenied
  }
}

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

    const error = await requestPermission(
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      {
        title: 'Background location permission',
        message: 'Permission for tracking device location in background',
      },
    )
    if (error !== ErrorCode.NoError) {
      return ErrorCode.BackgroundLocationPermissionDenied
    }

    return ErrorCode.NoError
  } catch (error) {
    console.error(error)
    return ErrorCode.Unknown
  }
}

//TODO
// export async function requestBluetoothPermissions() {
//   return (
//     (await requestPermission(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT, {
//       title: 'Permission for connecting to bluetooth devices',
//       message:
//         'Bluetooth permission is required for connecting to Cyclocomputer device',
//     })) &&
//     (await requestPermission(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, {
//       title: 'Permission for scanning bluetooth devices',
//       message:
//         'Bluetooth scan permission is required to scan for Cyclocomputer device',
//     })) &&
//     (await requestPermission(
//       PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
//       {
//         title: 'GPS permission',
//         message: 'GPS permission',
//       },
//     ))
//   )
// }