import type { Permission, Rationale } from 'react-native'
import { PermissionsAndroid } from 'react-native'
import { MapGenerator } from '../mapGenerator'

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

export function parseImageData(data: Uint8ClampedArray) {
  const pixelsCount =
    MapGenerator.OUTPUT_RESOLUTION * MapGenerator.OUTPUT_RESOLUTION

  if (pixelsCount % 8 !== 0) {
    throw new Error('pixelsCount must be divisible by 8')
  }

  const monoHLSB = new Uint8Array((pixelsCount / 8) | 0)

  const roadColors = [
    // // White
    // { r: 255, g: 255, b: 255 },

    // // Yellow
    // { r: 0xf7, g: 0xf9, b: 0xc0 },

    // // Orange
    // { r: 0xfc, g: 0xd6, b: 0xa4 },

    // Black
    { r: 0x00, g: 0x00, b: 0x00 },

    // Grey
    // { r: 0x74, g: 0x74, b: 0x74 }, //Needs tolerance value at about 64
  ]

  const routeColors = [
    // Cyan
    { r: 0x55, g: 0xff, b: 0xff },
  ]

  for (let y = 0; y < MapGenerator.OUTPUT_RESOLUTION; y++) {
    for (let x = 0; x < MapGenerator.OUTPUT_RESOLUTION; x++) {
      const i = y * MapGenerator.OUTPUT_RESOLUTION + x

      const r = data[i * 4 + 0]
      const g = data[i * 4 + 1]
      const b = data[i * 4 + 2]
      const tol = 16

      const isRoadColor = roadColors.some(
        (color) =>
          Math.abs(r - color.r) < tol &&
          Math.abs(g - color.g) < tol &&
          Math.abs(b - color.b) < tol,
      )
      const isRouteColor = routeColors.some(
        (color) =>
          Math.abs(r - color.r) < tol &&
          Math.abs(g - color.g) < tol &&
          Math.abs(b - color.b) < tol,
      )

      const v = isRouteColor ? (y + (x % 2)) % 2 : isRoadColor ? 0 : 1

      monoHLSB[((pixelsCount - 1 - i) / 8) | 0] |= v << i % 8
    }
  }

  return monoHLSB
}
