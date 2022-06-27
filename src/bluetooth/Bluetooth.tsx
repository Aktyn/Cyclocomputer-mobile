import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { BleManager, Device, State } from 'react-native-ble-plx'
import { useSnackbar } from '../snackbar/Snackbar'
import { requestBluetoothPermission } from './common'

const asyncNoop = () => Promise.resolve() as Promise<never>

interface BluetoothInterface {
  bluetoothState: State | null
  scanning: boolean
  toggleScanning: (enable: boolean) => Promise<void>

  detectedDevices: Device[]
  connectedDevices: Device[]
  connectToDevice: (deviceId: string) => Promise<boolean>
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
    }
  }, [])

  const toggleScanning = async (enable: boolean) => {
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
        { allowDuplicates: false },
        (error, scannedDevice) => {
          if (error) {
            openSnackbar({
              message: error.message,
            })
            return
          }
          if (
            !scannedDevice?.name ||
            detectedDevices.some(({ id }) => id === scannedDevice.id)
          ) {
            return
          }
          setDetectedDevices([...detectedDevices, scannedDevice])
        },
      )
    } else {
      bleManager.current.stopDeviceScan()
    }
    setScanning(enable)
  }

  const connectToDevice = async (deviceId: string) => {
    if (!bleManager.current) {
      return false
    }
    try {
      const device = await bleManager.current.connectToDevice(deviceId, {
        autoConnect: false,
      })
      openSnackbar({
        message: `Successfully connected to ${device.name}`,
      })
      setConnectedDevices([...connectedDevices, device])
      const subscription = device.onDisconnected((error) => {
        if (error) {
          openSnackbar({
            message: error.message,
          })
        }
        setConnectedDevices(
          connectedDevices.filter(({ id }) => id !== deviceId),
        )
        subscription.remove()
      })
      return true
    } catch (e: unknown) {
      openSnackbar({
        message: e instanceof Error ? e.message : String(e),
      })
      return false
    }
  }

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
