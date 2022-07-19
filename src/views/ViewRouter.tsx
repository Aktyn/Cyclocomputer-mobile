import { useEffect, useState } from 'react'
import type { AppStateStatus } from 'react-native'
import { AppState } from 'react-native'
import Canvas from 'react-native-canvas'
import DeviceInfo from 'react-native-device-info'
import { core } from '../core'
import { useBluetooth } from '../hooks/useBluetooth'
import { MainView } from './MainView'
import { ScanningView } from './ScanningView'

enum VIEW {
  SCANNING,
  MAIN,
}

export const ViewRouter = () => {
  // const canvasRef = useRef<Canvas>(null)

  const [view, setView] = useState(VIEW.SCANNING)
  const [appStateVisible, setAppStateVisible] = useState(AppState.currentState)

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

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // eslint-disable-next-line no-console
      console.log('App state', nextAppState)
      setAppStateVisible(nextAppState)
    }

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    )
    return () => {
      subscription.remove()
    }
  }, [])

  const isBackgroundState = !!appStateVisible.match(/inactive|background/)

  switch (view) {
    case VIEW.SCANNING:
      return isBackgroundState ? null : <ScanningView />
    case VIEW.MAIN:
      return (
        <>
          {isBackgroundState ? null : <MainView />}
          <Canvas
            // style={}
            ref={(canvasRef: Canvas) => {
              if (!canvasRef) {
                return
              }
              core
                .start(canvasRef)
                // eslint-disable-next-line no-console
                .catch(console.error)
            }}
          />
        </>
      )
    default:
      return null
  }
}
