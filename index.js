/* eslint-disable no-console */
if (!__DEV__) {
  console.log =
    console.warn =
    console.info =
    console.error =
    console.count =
    console.assert =
      () => null
}

import { registerRootComponent } from 'expo'
import App from './src/App'

registerRootComponent(App)
