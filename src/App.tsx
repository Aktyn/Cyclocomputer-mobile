import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Inter_100Thin,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
} from '@expo-google-fonts/inter'
import { useDimensions } from '@react-native-community/hooks'
import { registerRootComponent } from 'expo'
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
} from 'react-native'
import {
  Button,
  Caption,
  configureFonts,
  DefaultTheme,
  Headline,
  Paragraph,
  Provider,
  Subheading,
  Text,
  Title,
} from 'react-native-paper'
import { Fonts } from 'react-native-paper/lib/typescript/types'
import { darkTheme } from './themes/darkTheme'

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

export default function App() {
  const colorScheme = useColorScheme()
  const dimensions = useDimensions()

  const [appIsReady, setAppIsReady] = useState(false)

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

  console.log('color scheme: ', colorScheme, 'dimensions: ', dimensions)

  if (!appIsReady) {
    return null
  }

  return (
    <Provider theme={theme}>
      <SafeAreaView style={styles.container} onLayout={onLayoutRootView}>
        <StatusBar style="auto" />
        <Headline>Headline</Headline>
        <Title>Title</Title>
        <Subheading>Subheading</Subheading>
        <Text>Text</Text>
        <Paragraph>Paragraph</Paragraph>
        <Caption>Caption</Caption>
        <Button
          dark
          icon="camera"
          mode="contained"
          onPress={() => console.log('Tap!')}
        >
          Test
        </Button>
      </SafeAreaView>
    </Provider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBarProps.currentHeight : 0,
  },
})

registerRootComponent(App)