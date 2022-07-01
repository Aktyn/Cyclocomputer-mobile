import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Buffer } from '@craftzdog/react-native-buffer'
import { EmitterSubscription } from 'react-native'
import BluetoothSerial from 'react-native-bluetooth-serial-next'
import { useSnackbar } from '../snackbar/Snackbar'
import { requestBluetoothPermission } from './common'
import { IncomingMessageType, MessageType, STAMP } from './message'

const DEVICE_DATA_READ_FREQUENCY = 1000
const asyncNoop = () => Promise.resolve() as Promise<never>

type MessageListener = (message: IncomingMessageType, data: Uint8Array) => void

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
    data: string | ArrayBuffer,
  ) => Promise<boolean>
  messagesHandler: {
    on: (listener: MessageListener) => void
    off: (listener: MessageListener) => void
  }
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
  messagesHandler: {
    on: asyncNoop,
    off: asyncNoop,
  },
})

export const useBluetooth = () => {
  const context = useContext(BluetoothContext)
  return context
}

export const BluetoothProvider: FC<PropsWithChildren<unknown>> = ({
  children,
}) => {
  const { openSnackbar } = useSnackbar()
  const dataSubscriptionsRef = useRef(new Map<number, EmitterSubscription>())
  const messageListenersRef = useRef<MessageListener[]>([])

  const [bluetoothEnabled, setBluetoothEnabled] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [connectedDevices, setConnectedDevices] = useState<
    BluetoothSerial.AndroidBluetoothDevice[]
  >([])

  useEffect(() => {
    const deviceDataReadIntervals = new Map<
      string,
      ReturnType<typeof setInterval>
    >()

    const isStamp = (data: Uint8Array) => {
      if (data.length !== STAMP.byteLength) {
        return false
      }
      for (let i = 0; i < data.length; i++) {
        if (data[i] !== STAMP[i]) {
          return false
        }
      }

      return true
    }

    let rawDataBuffer = ''
    const handleDeviceData = (rawData: string) => {
      rawDataBuffer += rawData

      const bytes = Uint8Array.from(Buffer.from(rawDataBuffer, 'base64'))
      console.log(rawData, bytes.join(', '))
      if (bytes.length < STAMP.byteLength) {
        return
      }

      if (!isStamp(bytes.slice(0, STAMP.byteLength))) {
        rawDataBuffer = ''
        return
      }

      if (bytes.length < STAMP.byteLength + 5) {
        return
      }

      const message = bytes[STAMP.byteLength] as IncomingMessageType
      const dataSize =
        (bytes[STAMP.byteLength + 1] << 0) |
        (bytes[STAMP.byteLength + 2] << 8) |
        (bytes[STAMP.byteLength + 3] << 16) |
        (bytes[STAMP.byteLength + 4] << 24)
      const end = Math.min(bytes.length, STAMP.byteLength + 5 + dataSize)
      const data = bytes.slice(STAMP.byteLength + 5, end)

      rawDataBuffer =
        end >= bytes.length
          ? ''
          : Buffer.from(bytes.slice(end).buffer).toString('base64')

      messageListenersRef.current.forEach((listener) => listener(message, data))
    }

    const onDeviceDisconnected = (
      device: BluetoothSerial.AndroidBluetoothDevice,
    ) => {
      setConnectedDevices((currentConnectedDevices) =>
        currentConnectedDevices.filter(({ id }) => id !== device.id),
      )

      const deviceDataReadInterval = deviceDataReadIntervals.get(device.id)
      if (deviceDataReadInterval) {
        clearInterval(deviceDataReadInterval)
        deviceDataReadIntervals.delete(device.id)
      }
    }

    const handleBluetoothEnabled = () => {
      setBluetoothEnabled(true)
    }
    const handleBluetoothDisabled = () => {
      setBluetoothEnabled(false)
    }
    const handleConnectionSuccess = ({
      device: deviceInfo,
    }: {
      device?: BluetoothSerial.AndroidBluetoothDevice
    }) => {
      if (deviceInfo) {
        setConnectedDevices((currentConnectedDevices) => [
          ...currentConnectedDevices,
          deviceInfo,
        ])
        openSnackbar({
          message: `Successfully connected to ${deviceInfo.name}`,
        })

        let reading = false
        const interval = setInterval(async () => {
          if (reading) {
            return
          }
          reading = true
          BluetoothSerial.device(deviceInfo.id)
            .readFromDevice()
            .then((data) => {
              if (data) {
                handleDeviceData(data)
              }
            })
            .finally(() => (reading = false))
        }, DEVICE_DATA_READ_FREQUENCY)
        deviceDataReadIntervals.set(deviceInfo.id, interval)
      }
    }
    const handleConnectionFailed = ({
      device,
    }: {
      device?: BluetoothSerial.AndroidBluetoothDevice
    }) => {
      if (device) {
        onDeviceDisconnected(device)
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
        onDeviceDisconnected(device)
        openSnackbar({
          message: `Connection to ${device.name} lost`,
        })
      }
    }
    // const handleData = (result: { id: string; data: string }) => {
    //   if (result) {
    //     const { id, data } = result
    //     console.log(`Data from device ${id} : ${data}`)
    //   }
    // }
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
      // BluetoothSerial.on('data', handleData),
      BluetoothSerial.on('error', handleError),
    )

    const dataSubscriptionsMap = dataSubscriptionsRef.current

    return () => {
      subscriptions.forEach((subscription) => subscription.remove())
      dataSubscriptionsMap.forEach((subscription) => subscription.remove())
      BluetoothSerial.removeAllListeners()

      for (const interval of deviceDataReadIntervals.values()) {
        clearInterval(interval)
      }
      deviceDataReadIntervals.clear()
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

        const device = BluetoothSerial.device(deviceInfo.id)
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
        const device = BluetoothSerial.device(deviceId)
        const rawDataLength =
          typeof data === 'string' ? data.length : data.byteLength
        const buffer = Buffer.concat([
          STAMP,
          Buffer.from(Uint8Array.from([type])),
          Buffer.from(new Uint8Array(Uint32Array.from([rawDataLength]).buffer)),
          Buffer.from(data as never),
        ])

        console.log('Sending message:', type, 'data size:', buffer.byteLength)

        return device.write(buffer as never)
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

  const messagesHandler = useMemo<BluetoothInterface['messagesHandler']>(() => {
    return {
      on: (listener) => messageListenersRef.current.push(listener),
      off: (listener) => {
        messageListenersRef.current = messageListenersRef.current.filter(
          (l) => l !== listener,
        )
      },
    }
  }, [])

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
        messagesHandler,
      }}
    >
      {children}
    </BluetoothContext.Provider>
  )
}
