import React, { useEffect, useMemo, useState } from 'react'
import {
  Inter_100Thin,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
} from '@expo-google-fonts/inter'
import * as Font from 'expo-font'
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
import { SnackbarProvider } from './snackbar/Snackbar'
import { darkTheme } from './themes/darkTheme'
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
        // eslint-disable-next-line no-console
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

  if (!appIsReady) {
    return null
  }

  return (
    <Provider theme={theme}>
      <SnackbarProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar style="auto" />
          <ViewRouter />
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
