import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { Buffer } from '@craftzdog/react-native-buffer'
import { EmitterSubscription } from 'react-native'
import BluetoothSerial from 'react-native-bluetooth-serial-next'
import { useSnackbar } from '../snackbar/Snackbar'
import { requestBluetoothPermission } from './common'
import { MessageType } from './message'

const asyncNoop = () => Promise.resolve() as Promise<never>

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
  sendData: (
    deviceId: string,
    type: MessageType,
    data: string | Uint8Array,
  ) => Promise<boolean>
}

const BluetoothContext = createContext<BluetoothInterface>({
  bluetoothEnabled: false,
  requestBluetoothEnable: asyncNoop,
  scanning: false,
  scan: asyncNoop,
  connectToDevice: asyncNoop,
  devices: [],
  connectedDevices: [],
  sendData: asyncNoop,
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

    const subscriptions: EmitterSubscription[] = []

    subscriptions.push(
      BluetoothSerial.on('bluetoothEnabled', handleBluetoothEnabled),
      BluetoothSerial.on('bluetoothDisabled', handleBluetoothDisabled),
      BluetoothSerial.on('connectionSuccess', handleConnectionSuccess),
      BluetoothSerial.on('connectionFailed', handleConnectionFailed),
      BluetoothSerial.on('connectionLost', handleConnectionLost),
      BluetoothSerial.on('data', handleData),
      BluetoothSerial.on('error', handleError),
    )

    return () => {
      subscriptions.forEach((subscription) => subscription.remove())
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
        discoveredDevices.push(
          ...paired
            .filter((p) => !!p.name)
            .map((p) => ({ ...p, paired: true })),
        )
        setDevices(discoveredDevices)

        const unpaired =
          (await BluetoothSerial.discoverUnpairedDevices()) as BluetoothSerial.AndroidBluetoothDevice[]
        discoveredDevices.push(
          ...unpaired
            .filter(
              (p) => !!p.name && !discoveredDevices.find((d) => d.id === p.id),
            )
            .map((p) => ({ ...p, paired: false })),
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

  const connectToDevice = useCallback<BluetoothInterface['connectToDevice']>(
    async (deviceInfo) => {
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

  const sendData = useCallback<BluetoothInterface['sendData']>(
    async (deviceId, type, data) => {
      try {
        const device = await BluetoothSerial.device(deviceId)
        const rawData = Buffer.from(data as never)
        const buffer = Buffer.concat([
          Buffer.from(Uint8Array.from([type])),
          Buffer.from(Uint32Array.from([rawData.length])),
          rawData,
        ])
        return device.write(buffer.toString('base64'))
      } catch (error: unknown) {
        openSnackbar({
          message: `Cannot send data to device: ${
            error instanceof Error ? error.message : String(error)
          }`,
        })
        return false
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
        sendData,
      }}
    >
      {children}
    </BluetoothContext.Provider>
  )
}
