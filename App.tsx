import { useMemo } from 'react'
import { Accuracy, startLocationUpdatesAsync } from 'expo-location'
import { StatusBar } from 'expo-status-bar'
import {
  LogBox,
  Platform,
  StatusBar as StatusBarProps,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native'
import {
  Button,
  configureFonts,
  MD3LightTheme as DefaultTheme,
  Provider as PaperProvider,
  Text,
} from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LOCATION_TASK_NAME } from './src/backgroundTasks/locationBackgroundTask'
import { requestLocationPermissions } from './src/permissions'
import { SnackbarProvider } from './src/snackbar/Snackbar'
import { darkTheme } from './src/themes/darkTheme'

LogBox.ignoreAllLogs()

const fontConfig = {
  customVariant: {
    fontFamily: Platform.select({
      default: 'Inter, Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif',
    }),
    fontWeight: '400' as const,
    letterSpacing: 0.5,
    lineHeight: 22,
    fontSize: 20,
  },
}

export default function App() {
  const colorScheme = useColorScheme()

  const theme = useMemo(() => {
    const fonts = configureFonts({ config: fontConfig, isV3: true })

    return colorScheme === 'dark'
      ? { ...darkTheme, fonts }
      : { ...DefaultTheme, fonts }
  }, [colorScheme])

  const test = async () => {
    const hasPermissions = await requestLocationPermissions()
    console.log('hasPermissions:', hasPermissions)
    if (hasPermissions) {
      await startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Accuracy.BestForNavigation,
      })
    }
  }

  return (
    <PaperProvider theme={theme}>
      <SnackbarProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar style="auto" />
          <View>
            <Text variant="bodyMedium">Hello world!</Text>
            <Button icon="camera" mode="contained" onPress={test}>
              Press me
            </Button>
          </View>
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
