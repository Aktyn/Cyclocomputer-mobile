import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Inter_100Thin,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
} from '@expo-google-fonts/inter'
import * as Font from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import {
  StyleSheet,
  SafeAreaView,
  useColorScheme,
  Platform,
  StatusBar as StatusBarProps,
  PlatformOSType,
  LogBox,
} from 'react-native'
import { configureFonts, DefaultTheme, Provider } from 'react-native-paper'
import { Fonts } from 'react-native-paper/lib/typescript/types'
import { BluetoothProvider, useBluetooth } from './bluetooth/Bluetooth'
import { SnackbarProvider } from './snackbar/Snackbar'
import { darkTheme } from './themes/darkTheme'
import { MainView } from './views/MainView'
import { ScanningView } from './views/ScanningView'

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

enum VIEW {
  SCANNING,
  MAIN,
}

const App = () => {
  const colorScheme = useColorScheme()
  // const dimensions = useDimensions()

  const [appIsReady, setAppIsReady] = useState(false)
  const [view, setView] = useState(VIEW.SCANNING)

  useEffect(() => {
    async function prepare() {
      try {
        await SplashScreen.preventAutoHideAsync()
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

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync()
    }
  }, [appIsReady])

  const { connectedDevices } = useBluetooth()

  useEffect(() => {
    if (connectedDevices.length) {
      setView(VIEW.MAIN)
    } else {
      setView(VIEW.SCANNING)
    }
  }, [connectedDevices.length])

  // console.log('color scheme: ', colorScheme, 'dimensions: ', dimensions)

  if (!appIsReady) {
    return null
  }

  return (
    <Provider theme={theme}>
      <SnackbarProvider>
        <BluetoothProvider>
          <SafeAreaView style={styles.container} onLayout={onLayoutRootView}>
            <StatusBar style="auto" />
            {view === VIEW.SCANNING ? (
              <ScanningView />
            ) : view === VIEW.MAIN ? (
              <MainView />
            ) : null}
            {/* <Headline>Headline</Headline>
        <Title>Title</Title>
        <Subheading>Subheading</Subheading>
        <Text>Text</Text>
        <Paragraph>Paragraph</Paragraph>
        <Caption>Caption</Caption> */}
          </SafeAreaView>
        </BluetoothProvider>
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
})

export default App
