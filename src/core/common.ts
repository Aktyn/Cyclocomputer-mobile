import { Buffer } from '@craftzdog/react-native-buffer'
import type { Permission, Rationale } from 'react-native'
import { PermissionsAndroid } from 'react-native'
import { MapGeneratorV2 } from './map/mapGeneratorV2'

const imageDataPrefix = Buffer.from('<MAP_PREVIEW>', 'ascii')
const imageDataSuffix = Buffer.from('</MAP_PREVIEW>', 'ascii')

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

export function requestBackgroundLocationPermissions() {
  return requestPermission(
    PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
    {
      title: 'Background location permission',
      message: 'Permission for tracking device location in background',
    },
  )
}

/** @param data Grayscale image data */
export function parseImageDataV2(
  data: Uint8ClampedArray | Uint8Array,
  grayscaleTolerance: number,
) {
  if (data.length !== MapGeneratorV2.OUTPUT_RESOLUTION ** 2) {
    throw new Error(`Invalid image data length: ${data.length}`)
  }
  const pixelsCount = data.length

  if (pixelsCount % 8 !== 0) {
    throw new Error('pixelsCount must be divisible by 8')
  }

  const monoHLSB = new Uint8Array(
    ((pixelsCount / 8) | 0) +
      imageDataPrefix.byteLength +
      imageDataSuffix.byteLength,
  )
  monoHLSB.set(imageDataPrefix, 0)

  for (let y = 0; y < MapGeneratorV2.OUTPUT_RESOLUTION; y++) {
    for (let x = 0; x < MapGeneratorV2.OUTPUT_RESOLUTION; x++) {
      const i = y * MapGeneratorV2.OUTPUT_RESOLUTION + x

      const gray = data[i]
      const tol = grayscaleTolerance

      const v = gray < tol ? 0 : 1

      monoHLSB[
        (((pixelsCount - 1 - i) / 8) | 0) + imageDataPrefix.byteLength
      ] |= v << i % 8
    }
  }

  monoHLSB.set(imageDataSuffix, monoHLSB.length - imageDataSuffix.byteLength)
  return monoHLSB
}
