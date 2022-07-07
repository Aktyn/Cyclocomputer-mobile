import { useEffect, useState } from 'react'
import DeviceInfo from 'react-native-device-info'
import { useBluetooth } from '../hooks/useBluetooth'
import { MainView } from './MainView'
import { ScanningView } from './ScanningView'

enum VIEW {
  SCANNING,
  MAIN,
}

export const ViewRouter = () => {
  const [view, setView] = useState(VIEW.SCANNING)

  const { connectedDevices } = useBluetooth()

  useEffect(() => {
    if (connectedDevices.length) {
      setView(VIEW.MAIN)
    } else {
      setView(VIEW.SCANNING)
    }
  }, [connectedDevices.length])

  useEffect(() => {
    DeviceInfo.isEmulator().then((emulator) => {
      if (emulator) {
        setView(VIEW.MAIN)
      }
    })
  }, [])

  switch (view) {
    case VIEW.SCANNING:
      return <ScanningView />
    case VIEW.MAIN:
      return <MainView />
    default:
      return null
  }
}
