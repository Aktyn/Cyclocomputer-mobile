import { useEffect, useMemo, useState } from 'react'
import {
  Inter_100Thin,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
} from '@expo-google-fonts/inter'
import * as Font from 'expo-font'
import { StatusBar } from 'expo-status-bar'
import {
  LogBox,
  Platform,
  StatusBar as StatusBarProps,
  StyleSheet,
  useColorScheme,
} from 'react-native'
import {
  configureFonts,
  MD3LightTheme as DefaultTheme,
  Provider as PaperProvider,
} from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SnackbarProvider } from './snackbar/Snackbar'
import { darkTheme } from './themes/darkTheme'
import { RouteView } from './views/RouteView'
import './modules/location/locationBackgroundTask'

LogBox.ignoreAllLogs()

const fontConfig = {
  customVariant: {
    fontFamily: Platform.select({
      default:
        'Inter, Inter400, Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif',
    }),
    fontWeight: '400' as const,
    letterSpacing: 0.5,
    lineHeight: 22,
    fontSize: 20,
  },
}

export default function App() {
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
      } catch (error) {
        console.error(error)
      } finally {
        setAppIsReady(true)
      }
    }

    prepare()
  }, [])

  const theme = useMemo(() => {
    const fonts = configureFonts({ config: fontConfig, isV3: true })

    return colorScheme === 'dark'
      ? { ...darkTheme, fonts }
      : { ...DefaultTheme, fonts }
  }, [colorScheme])

  if (!appIsReady) {
    return null
  }

  return (
    <PaperProvider theme={theme}>
      <SnackbarProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar style="auto" />
          <RouteView />
        </SafeAreaView>
      </SnackbarProvider>
    </PaperProvider>
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
