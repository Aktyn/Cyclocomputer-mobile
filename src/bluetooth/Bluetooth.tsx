import { Buffer } from 'buffer'
import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  BleManager,
  Device,
  ScanMode,
  State,
  Subscription,
} from 'react-native-ble-plx'
import { useSnackbar } from '../snackbar/Snackbar'
import { requestBluetoothPermission } from './common'

const asyncNoop = () => Promise.resolve() as Promise<never>

interface BluetoothInterface {
  bluetoothState: State | null
  scanning: boolean
  toggleScanning: (enable: boolean) => Promise<void>

  detectedDevices: Device[]
  connectedDevices: Device[]
  connectToDevice: (device: Device) => Promise<boolean>
}

const BluetoothContext = createContext<BluetoothInterface>({
  bluetoothState: null,
  scanning: false,
  toggleScanning: asyncNoop,
  detectedDevices: [],
  connectedDevices: [],
  connectToDevice: asyncNoop,
})

export const useBluetooth = () => {
  const context = useContext(BluetoothContext)
  return context
}

export const BluetoothProvider: FC<PropsWithChildren<unknown>> = ({
  children,
}) => {
  const bleManager = useRef(new BleManager())

  const [bluetoothState, setBluetoothState] = useState<State | null>(null)
  const [scanning, setScanning] = useState(false)
  const [detectedDevices, setDetectedDevices] = useState<Device[]>([])
  const [connectedDevices, setConnectedDevices] = useState<Device[]>([])
  const { openSnackbar } = useSnackbar()

  useEffect(() => {
    if (!bleManager.current) {
      return
    }
    bleManager.current.state().then(setBluetoothState)
    const stateSubscription = bleManager.current.onStateChange((newState) => {
      setBluetoothState(newState)
    }, false)

    return () => {
      stateSubscription.remove()
      // bleManager.current?.destroy()
    }
  }, [])

  const toggleScanning = useCallback(
    async (enable: boolean) => {
      if (enable === scanning || !bleManager.current) {
        return
      }
      if (enable) {
        const permission = await requestBluetoothPermission()
        if (!permission) {
          openSnackbar({
            message: 'Bluetooth permissions denied',
          })
          return
        }

        bleManager.current.startDeviceScan(
          null,
          { allowDuplicates: false, scanMode: ScanMode.LowLatency },
          (error, scannedDevice) => {
            if (error) {
              openSnackbar({
                message: error.message,
              })
              return
            }
            if (
              !scannedDevice?.name ||
              !scannedDevice?.id
              // detectedDevices.some(({ id }) => id === scannedDevice.id)
            ) {
              return
            }
            setDetectedDevices((devices) =>
              devices.some(({ id }) => id === scannedDevice.id)
                ? devices
                : [...devices, scannedDevice],
            )
          },
        )
      } else {
        bleManager.current.stopDeviceScan()
      }
      setScanning(enable)
    },
    [openSnackbar, scanning],
  )

  const connectToDevice = useCallback(
    async (device: Device) => {
      if (!bleManager.current) {
        return false
      }
      try {
        await device.connect({
          autoConnect: true,
          timeout: 10000,
        })
        await device.discoverAllServicesAndCharacteristics()

        const services = await device.services()
        const characteristicSubscriptions: Subscription[] = []
        for (const service of services) {
          const characteristics = await service.characteristics()
          for (const characteristic of characteristics) {
            console.log(
              `[Characteristic] id: ${characteristic.id}, writable: ${characteristic.isWritableWithResponse}, ${characteristic.isWritableWithoutResponse}, readable: ${characteristic.isReadable}, ${characteristic.isNotifiable}`,
            )
            if (characteristic.isReadable && characteristic.isNotifiable) {
              const subscription = characteristic.monitor((error, self) => {
                if (error) {
                  openSnackbar({
                    message: error.message,
                  })
                  return
                }
                if (self && self.value) {
                  console.log(
                    'characteristic id:',
                    self.id,
                    'value:',
                    Buffer.from(self.value, 'base64').toString('utf8'),
                  )
                }
              })
              characteristicSubscriptions.push(subscription)
            }

            //TEMP
            // if (characteristic.isWritableWithoutResponse) {
            //   try {
            //     // const buffer = Buffer.from('Hello World').toString('base64')
            //     // await characteristic.writeWithoutResponse(buffer)
            //     // console.log('Sent!!!')

            //     setTimeout(async () => {
            //       const buffer2 =
            //         Buffer.from('Hello World 2').toString('base64')
            //       await characteristic.writeWithoutResponse(buffer2)
            //     }, 5000)
            //   } catch (e) {
            //     console.error(e)
            //   }
            // }
          }
        }

        openSnackbar({
          message: `Successfully connected to ${device.name}`,
        })
        setConnectedDevices((devices) => [...devices, device])

        setInterval(async () => {
          bleManager.current
            .connectedDevices([])
            .then((devices) =>
              console.log('Connected devices count:', devices.length),
            )

          console.log('test1', await device.isConnected())
          console.log(
            'test1',
            await bleManager.current?.isDeviceConnected(device.id),
          )
        }, 5000)

        const disconnectSubscription = device.onDisconnected((error) => {
          console.log('Disconnected')
          if (error) {
            openSnackbar({
              message: error.message,
            })
          } else {
            openSnackbar({
              message: `Disconnected from ${device.name}`,
            })
          }
          setConnectedDevices((devices) =>
            devices.filter(({ id }) => id !== device.id),
          )
          disconnectSubscription.remove()
          characteristicSubscriptions.forEach((subscription) =>
            subscription.remove(),
          )
        })
        return true
      } catch (e: unknown) {
        console.error(e)
        openSnackbar({
          message: e instanceof Error ? e.message : String(e),
        })
        return false
      }
    },
    [openSnackbar],
  )

  return (
    <BluetoothContext.Provider
      value={{
        bluetoothState,
        scanning,
        toggleScanning,
        detectedDevices,
        connectedDevices,
        connectToDevice,
      }}
    >
      {children}
    </BluetoothContext.Provider>
  )
}
