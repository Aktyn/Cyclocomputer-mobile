import { Permission, PermissionsAndroid, Rationale } from 'react-native'

async function requestPermission(
  permission: Permission,
  rationale: Partial<Rationale>,
) {
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
      return true
    } else {
      return false
    }
  } catch (err) {
    return false
  }
}

export async function requestBluetoothPermissions() {
  return (
    (await requestPermission(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT, {
      title: 'Permission for connecting to bluetooth devices',
      message:
        'Bluetooth permission is required for connecting to Cyclocomputer device',
    })) &&
    (await requestPermission(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, {
      title: 'Permission for scanning bluetooth devices',
      message:
        'Bluetooth scan permission is required to scan for Cyclocomputer device',
    })) &&
    (await requestPermission(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'GPS permission',
        message: 'GPS permission',
      },
    ))
  )
}
