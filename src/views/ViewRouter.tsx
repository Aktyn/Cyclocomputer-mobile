import { useEffect, useState } from 'react'
import type { AppStateStatus } from 'react-native'
import { AppState } from 'react-native'
import DeviceInfo from 'react-native-device-info'
import { Core } from '../core'
import { MessageType } from '../core/message'
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
  const [appState, setAppState] = useState(AppState.currentState)

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
        // setView(VIEW.DEBUG)
        Core.instance.start().finally(() => setView(VIEW.MAIN))
      }
    })

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // eslint-disable-next-line no-console
      console.log('App state', nextAppState)
      setAppState(nextAppState)

      const isBackgroundState = !!nextAppState.match(/inactive|background/)
      if (!Core.instance.running) {
        return
      }

      const cyclocomputer = Core.instance.getCyclocomputer()
      if (!cyclocomputer) {
        return
      }

      Core.instance.bluetooth
        .sendData(
          cyclocomputer.id,
          MessageType.SET_MOBILE_APP_STATE,
          Uint8Array.from([isBackgroundState ? 1 : 0]).buffer,
        )
        .then((success) => {
          if (!success) {
            // eslint-disable-next-line no-console
            console.error('Cannot send mobile app state')
          }
        })
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

  const isBackgroundState = !!appState.match(/inactive|background/)

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
