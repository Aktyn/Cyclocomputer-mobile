import { useEffect, useState } from 'react'
import type { AppStateStatus } from 'react-native'
import { AppState } from 'react-native'
import DeviceInfo from 'react-native-device-info'
import { Core } from '../core'
import { useBluetooth } from '../hooks/useBluetooth'
import { DebugView } from './DebugView'
import { MainView } from './MainView'
import { ScanningView } from './ScanningView'

enum VIEW {
  SCANNING,
  MAIN,
  DEBUG,
}

export const ViewRouter = () => {
  const [view, setView] = useState(VIEW.SCANNING)
  const [appStateVisible, setAppStateVisible] = useState(AppState.currentState)

  const { connectedDevices } = useBluetooth()

  useEffect(() => {
    if (connectedDevices.length) {
      Core.instance.start().finally(() => setView(VIEW.MAIN))
    } else if (Core.instance.running) {
      Core.instance
        .stop()
        .catch(() => undefined)
        .finally(() => {
          setView(VIEW.SCANNING)
        })
    }
  }, [connectedDevices.length])

  useEffect(() => {
    DeviceInfo.isEmulator().then((emulator) => {
      if (emulator) {
        setView(VIEW.DEBUG)
        //! Core.instance.start().finally(() => setView(VIEW.MAIN))
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
      Core.instance.stop()
    }
  }, [])

  const isBackgroundState = !!appStateVisible.match(/inactive|background/)

  switch (view) {
    case VIEW.SCANNING:
      return isBackgroundState ? null : <ScanningView />
    case VIEW.MAIN:
      return isBackgroundState ? null : <MainView />
    case VIEW.DEBUG:
      return <DebugView />
    default:
      return null
  }
}
