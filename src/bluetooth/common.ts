import { PermissionsAndroid } from 'react-native'

export async function requestBluetoothPermission() {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT, //ACCESS_FINE_LOCATION,
      {
        title: 'Permission for bluetooth...',
        message: 'Bluetooth permission is required to scan for devices',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    )
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      // console.log('Location permission for bluetooth scanning granted')
      return true
    } else {
      // console.log('Location permission for bluetooth scanning revoked')
      return false
    }
  } catch (err) {
    // console.warn(err)
    return false
  }
}
