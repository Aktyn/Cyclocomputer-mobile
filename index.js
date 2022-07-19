/* eslint-disable no-console */
if (!__DEV__) {
  console.log = () => null
  console.warn = () => null
  console.info = () => null
  console.error = () => null
}

import { registerRootComponent } from 'expo'
import App from './src/App'

registerRootComponent(App)
