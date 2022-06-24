import { PermissionsAndroid } from 'react-native'
import { BleManager } from 'react-native-ble-plx'

export async function requestLocationPermission() {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, //ACCESS_FINE_LOCATION,
      {
        title: 'Location permission for bluetooth scanning',
        message: 'Hablablabla',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    )
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('Location permission for bluetooth scanning granted')
      return true
    } else {
      console.log('Location permission for bluetooth scanning revoked')
      return false
    }
  } catch (err) {
    console.warn(err)
    return false
  }
}

class Bluetooth {
  private readonly bleManager: BleManager

  constructor() {
    this.bleManager = new BleManager()
  }

  async startScan() {
    const permission = await requestLocationPermission()
    console.log('permission:', permission)
    this.bleManager.startDeviceScan(
      null,
      { allowDuplicates: true },
      (error, scannedDevice) => {
        if (error) {
          console.error(error)
          return
        }
        console.log('device:', scannedDevice)
      },
    )
  }

  stopScan() {
    this.bleManager.stopDeviceScan()
  }
}

export const bluetooth = new Bluetooth()
