import { useDimensions } from '@react-native-community/hooks';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { Provider, Text, ThemeProvider } from 'react-native-paper';
import { blueGrey } from 'material-ui-colors';
import React from 'react';
import { StyleSheet, SafeAreaView, useColorScheme, Platform, StatusBar as StatusBarProps } from 'react-native';
import { darkTheme } from './themes/darkTheme';



export default function App() {
  const colorScheme = useColorScheme();
  const dimensions = useDimensions()
  
  console.log('color scheme: ', colorScheme,'dimensions: ', dimensions);
  return (
    <Provider>
      <ThemeProvider theme={darkTheme}>
        <SafeAreaView style={styles.container}>
          <Text style={{fontSize: 32}}>Hello there</Text>
          <StatusBar style="auto" />
        </SafeAreaView>
      </ThemeProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
    alignItems: 'center',
    // justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBarProps.currentHeight : 0
  },
});

registerRootComponent(App)