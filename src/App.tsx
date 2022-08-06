/* eslint-disable no-console */
import React, { useEffect, useMemo, useState } from 'react'
import {
  Inter_100Thin,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
} from '@expo-google-fonts/inter'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Font from 'expo-font'
import * as Location from 'expo-location'
import { StatusBar } from 'expo-status-bar'
import type { PlatformOSType } from 'react-native'
import {
  StyleSheet,
  SafeAreaView,
  useColorScheme,
  Platform,
  StatusBar as StatusBarProps,
  LogBox,
} from 'react-native'
import { configureFonts, DefaultTheme, Provider } from 'react-native-paper'
import type { Fonts } from 'react-native-paper/lib/typescript/types'
import { Core } from './core'
import type { SettingsSchema } from './core/settings'
import { SnackbarProvider } from './snackbar/Snackbar'
import { darkTheme } from './themes/darkTheme'
import { tryParseJSON, waitFor } from './utils'
import { DebugView } from './views/DebugView'
import { ViewRouter } from './views/ViewRouter'

import './core/gpsTask'

LogBox.ignoreAllLogs()

const fontConfig: {
  [platform in PlatformOSType | 'default']?: Fonts
} = {
  default: {
    thin: {
      fontFamily: 'Inter100',
      fontWeight: 'normal',
    },
    light: {
      fontFamily: 'Inter300',
      fontWeight: 'normal',
    },
    regular: {
      fontFamily: 'Inter400',
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: 'Inter500',
      fontWeight: 'normal',
    },
  },
}

const App = () => {
  const colorScheme = useColorScheme()

  const [appIsReady, setAppIsReady] = useState(false)
  const [isCoreReady, setIsCoreReady] = useState(false)

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          Inter100: Inter_100Thin,
          Inter300: Inter_300Light,
          Inter400: Inter_400Regular,
          Inter500: Inter_500Medium,
        })
      } catch (e) {
        console.error(e)
      } finally {
        setAppIsReady(true)
      }
    }

    prepare()
  }, [])

  const theme = useMemo(() => {
    const fonts = configureFonts(fontConfig)

    return colorScheme === 'dark'
      ? { ...darkTheme, fonts }
      : { ...DefaultTheme, fonts }
  }, [colorScheme])

  useEffect(() => {
    console.log('Loading settings')
    AsyncStorage.getItem('@settings')
      .then((settingsString) => {
        return tryParseJSON(settingsString ?? '{}', {} as SettingsSchema)
      })
      .then((settings) => {
        console.log('Starting background task')
        return Location.startLocationUpdatesAsync('BACKGROUND_LOCATION_TASK', {
          accuracy: settings.gpsAccuracy,
          timeInterval: settings.gpsTimeInterval,
          deferredUpdatesInterval: settings.gpsTimeInterval,
          distanceInterval: settings.gpsDistanceSensitivity,
          deferredUpdatesDistance: settings.gpsDistanceSensitivity,

          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Location',
            notificationBody: 'Location tracking in background',
            notificationColor: '#fff',
          },
        })
      })
      .then(() => {
        console.log('Awaiting for core to be ready')
        return waitFor(() => Core.isInitialized(), 10000, 200)
      })
      .then(() => {
        console.log('Everything is ready')
        setIsCoreReady(true)
      })
      .catch((e) =>
        console.error(`Error: ${e instanceof Error ? e.message : e}`),
      )

    return () => {
      Location.stopLocationUpdatesAsync('BACKGROUND_LOCATION_TASK')
    }
  }, [])

  if (!appIsReady) {
    return null
  }

  return (
    <Provider theme={theme}>
      <SnackbarProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar style="auto" />
          {isCoreReady ? (
            <ViewRouter />
          ) : (
            <DebugView />
            // <ActivityIndicator
            //   style={styles.spinner}
            //   size="large"
            //   animating={true}
            // />
          )}
        </SafeAreaView>
      </SnackbarProvider>
    </Provider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBarProps.currentHeight : 0,
  },
  spinner: {
    marginTop: '50%',
  },
})

export default App
