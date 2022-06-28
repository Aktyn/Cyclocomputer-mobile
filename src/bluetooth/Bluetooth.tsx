import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import BluetoothSerial from 'react-native-bluetooth-serial-next'
import { useSnackbar } from '../snackbar/Snackbar'
import { requestBluetoothPermission } from './common'

const asyncNoop = () => Promise.resolve() as Promise<never>

// const id = '6B:14:9B:03:03:99'

// async function test() {
//   const id = '6B:14:9B:03:03:99'

//   console.log('Bluetooth enabled:', await BluetoothSerial.isEnabled())

//   const paired =
//     (await BluetoothSerial.list()) as BluetoothSerial.AndroidBluetoothDevice[]
//   // console.log('x', paired);

//   const deviceInfo =
//     paired.find((p: BluetoothSerial.AndroidBluetoothDevice) => p.id === id) ||
//     (await BluetoothSerial.pairDevice(id))
//   console.log(deviceInfo)

//   if (deviceInfo) {
//     const device = await BluetoothSerial.device(deviceInfo.id)
//     // console.log('device', device)
//     device.read((data, _subscription) => {
//       console.log('data', data)

//       // subscription.remove()
//       return {}
//     })
//     await device.connect()
//     console.log('connected')
//     // await device.readFromDevice()

//     await new Promise((resolve) => setTimeout(resolve, 2000))
//     console.log(await device.readFromDevice())

//     await new Promise((resolve) => setTimeout(resolve, 2000))
//     console.log(
//       await device.write(
//         new Array(128 * 128)
//           .fill('null')
//           .map((_, i) => i % 2)
//           .join('') + 'HUH',
//       ),
//     )
//   } else {
//     console.log('no device')
//   }
// }

// test().catch(console.error)

interface DeviceInfo extends BluetoothSerial.AndroidBluetoothDevice {
  paired: boolean
}

interface BluetoothInterface {
  bluetoothEnabled: boolean
  requestBluetoothEnable: () => Promise<void>
  scanning: boolean
  scan: (timeout?: number) => Promise<void>
  connectToDevice: (device: DeviceInfo) => Promise<void>
  devices: DeviceInfo[]
  connectedDevices: BluetoothSerial.AndroidBluetoothDevice[]
}

const BluetoothContext = createContext<BluetoothInterface>({
  bluetoothEnabled: false,
  requestBluetoothEnable: asyncNoop,
  scanning: false,
  scan: asyncNoop,
  connectToDevice: asyncNoop,
  devices: [],
  connectedDevices: [],
})

export const useBluetooth = () => {
  const context = useContext(BluetoothContext)
  return context
}

export const BluetoothProvider: FC<PropsWithChildren<unknown>> = ({
  children,
}) => {
  const { openSnackbar } = useSnackbar()

  const [bluetoothEnabled, setBluetoothEnabled] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [connectedDevices, setConnectedDevices] = useState<
    BluetoothSerial.AndroidBluetoothDevice[]
  >([])

  useEffect(() => {
    const handleBluetoothEnabled = () => {
      setBluetoothEnabled(true)
    }
    const handleBluetoothDisabled = () => {
      setBluetoothEnabled(false)
    }
    const handleConnectionSuccess = ({
      device,
    }: {
      device?: BluetoothSerial.AndroidBluetoothDevice
    }) => {
      if (device) {
        setConnectedDevices((currentConnectedDevices) => [
          ...currentConnectedDevices,
          device,
        ])
        openSnackbar({
          message: `Successfully connected to ${device.name}`,
        })
      }
    }
    const handleConnectionFailed = ({
      device,
    }: {
      device?: BluetoothSerial.AndroidBluetoothDevice
    }) => {
      if (device) {
        setConnectedDevices((currentConnectedDevices) =>
          currentConnectedDevices.filter(({ id }) => id !== device.id),
        )
        openSnackbar({
          message: `Connection to ${device.name} failed`,
        })
      }
    }
    const handleConnectionLost = ({
      device,
    }: {
      device?: BluetoothSerial.AndroidBluetoothDevice
    }) => {
      if (device) {
        setConnectedDevices((currentConnectedDevices) =>
          currentConnectedDevices.filter(({ id }) => id !== device.id),
        )
        openSnackbar({
          message: `Connection to ${device.name} lost`,
        })
      }
    }
    const handleData = (result: { id: string; data: string }) => {
      if (result) {
        const { id, data } = result
        console.log(`Data from device ${id} : ${data}`)
      }
    }
    const handleError = (e: Error) => {
      openSnackbar({
        message: `Error: ${e.message}`,
      })
    }

    requestBluetoothPermission()
      .then((permission) => {
        if (!permission) {
          openSnackbar({
            message: 'Bluetooth permission denied',
          })
          return false
        }

        return BluetoothSerial.isEnabled()
      })
      .then((enabled) =>
        enabled ? handleBluetoothEnabled() : handleBluetoothDisabled(),
      )

    BluetoothSerial.on('bluetoothEnabled', handleBluetoothEnabled)
    BluetoothSerial.on('bluetoothDisabled', handleBluetoothDisabled)
    BluetoothSerial.on('connectionSuccess', handleConnectionSuccess)
    BluetoothSerial.on('connectionFailed', handleConnectionFailed)
    BluetoothSerial.on('connectionLost', handleConnectionLost)
    BluetoothSerial.on('data', handleData)
    BluetoothSerial.on('error', handleError)

    return () => {
      BluetoothSerial.off('bluetoothEnabled', handleBluetoothEnabled)
      BluetoothSerial.off('bluetoothDisabled', handleBluetoothDisabled)
      BluetoothSerial.off('connectionSuccess', handleConnectionSuccess)
      BluetoothSerial.off('connectionFailed', handleConnectionFailed)
      BluetoothSerial.off('connectionLost', handleConnectionLost)
      BluetoothSerial.off('data', handleData)
      BluetoothSerial.off('error', handleError)
      BluetoothSerial.removeAllListeners()
    }
  }, [openSnackbar])

  const scan = useCallback(
    async (timeout = 30000) => {
      setScanning(true)
      let timedOut = false
      const tm = setTimeout(() => {
        timedOut = true
        setScanning(false)
        BluetoothSerial.cancelDiscovery()
      }, timeout)

      try {
        const discoveredDevices: DeviceInfo[] = []

        const paired =
          (await BluetoothSerial.list()) as BluetoothSerial.AndroidBluetoothDevice[]
        discoveredDevices.push(...paired.map((p) => ({ ...p, paired: true })))
        setDevices(discoveredDevices)

        const unpaired =
          (await BluetoothSerial.discoverUnpairedDevices()) as BluetoothSerial.AndroidBluetoothDevice[]
        discoveredDevices.push(
          ...unpaired.map((p) => ({ ...p, paired: false })),
        )
        setDevices(discoveredDevices)

        if (timedOut) {
          throw new Error('Timeout')
        }
      } catch (error: unknown) {
        openSnackbar({
          message: `Error occurred while scanning for devices: ${
            error instanceof Error ? error.message : String(error)
          }`,
        })
      }
      clearTimeout(tm)
      setScanning(false)
    },
    [openSnackbar],
  )

  const connectToDevice = useCallback(
    async (deviceInfo: DeviceInfo) => {
      try {
        if (!deviceInfo.paired) {
          await BluetoothSerial.pairDevice(deviceInfo.id)
        }

        const device = await BluetoothSerial.device(deviceInfo.id)
        await device.connect()
      } catch (e) {
        openSnackbar({
          message: `Cannot connect to device ${deviceInfo.name}`,
        })
      }
    },
    [openSnackbar],
  )

  const requestBluetoothEnable = useCallback(async () => {
    try {
      await BluetoothSerial.requestEnable()
    } catch (e) {
      openSnackbar({
        message: 'Cannot enable bluetooth',
      })
    }
  }, [openSnackbar])

  return (
    <BluetoothContext.Provider
      value={{
        bluetoothEnabled,
        requestBluetoothEnable,
        scanning,
        scan,
        connectToDevice,
        devices,
        connectedDevices,
      }}
    >
      {children}
    </BluetoothContext.Provider>
  )
}
