import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { DocumentResult } from 'expo-document-picker'
import { useBluetooth } from '../bluetooth'
import { IncomingMessageType, MessageType } from '../bluetooth/message'
import { useSnackbar } from '../snackbar/Snackbar'
import { tryParseJSON } from '../utils'

const defaultSettings = {
  circumference: 223,
  gpxFile: null as null | (DocumentResult & { type: 'success' }),
}

interface SettingsInterface {
  settings: typeof defaultSettings
  setSetting: (
    key: keyof typeof defaultSettings,
    value: typeof defaultSettings[typeof key],
  ) => void
}

const SettingsContext = createContext<SettingsInterface>({
  settings: { ...defaultSettings },
  setSetting: () => undefined,
})

export const useSettings = () => {
  const context = useContext(SettingsContext)
  return context
}

export const SettingsProvider: FC<PropsWithChildren<unknown>> = ({
  children,
}) => {
  const { openSnackbar } = useSnackbar()
  const { connectedDevices, sendData, messagesHandler } = useBluetooth()
  const cyclocomputer = connectedDevices[0] ?? { id: 'mock' }

  const [settings, setSettings] = useState(defaultSettings)

  const sendUpdate = useCallback(() => {
    sendData(
      cyclocomputer.id,
      MessageType.SET_CIRCUMFERENCE,
      new Uint8Array(Float32Array.from([settings.circumference]).buffer).buffer,
    ).then((success) => {
      if (!success) {
        openSnackbar({ message: 'Cannot update circumference updated' })
      }
    })
  }, [cyclocomputer.id, openSnackbar, sendData, settings.circumference])

  useEffect(() => {
    sendUpdate()

    const handleMessage = (message: IncomingMessageType, _data: Uint8Array) => {
      if (message === IncomingMessageType.REQUEST_SETTINGS) {
        console.log(
          'Sending settings after receiving request for settings update',
        )
        sendUpdate()
      }
    }

    messagesHandler.on(handleMessage)

    return () => {
      messagesHandler.off(handleMessage)
    }
  }, [messagesHandler, sendUpdate])

  useEffect(() => {
    AsyncStorage.getItem('@settings')
      .then((settingsString) => {
        if (settingsString) {
          setSettings(tryParseJSON(settingsString, defaultSettings))
        }
      })
      .catch((error) => {
        openSnackbar({
          message: `Cannot read circumference value: ${
            error instanceof Error ? error.message : String(error)
          }`,
        })
      })
  }, [openSnackbar])

  const setSetting = useCallback<SettingsInterface['setSetting']>(
    (key, value) => {
      setSettings((s) => {
        AsyncStorage.setItem('@settings', JSON.stringify(s)).catch((error) => {
          openSnackbar({
            message: `Cannot update "${key}" setting: ${
              error instanceof Error ? error.message : String(error)
            }`,
          })
        })
        return { ...s, [key]: value }
      })
    },
    [openSnackbar],
  )

  return (
    <SettingsContext.Provider
      value={{
        settings,
        setSetting,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}
