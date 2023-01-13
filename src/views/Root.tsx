import { useEffect, useState } from 'react'
import * as Device from 'expo-device'
import { useAppState } from '../hooks/useAppState'
import { RouteView } from './RouteView'

enum VIEW {
  ROUTE,
}

export const Root = () => {
  const [view, _setView] = useState(VIEW.ROUTE)
  const { backgroundState } = useAppState()

  useEffect(() => {
    if (!Device.isDevice) {
      // eslint-disable-next-line no-console
      console.log('Running on emulator')
    }
  }, [])

  if (backgroundState) {
    return null
  }

  switch (view) {
    case VIEW.ROUTE:
      return <RouteView />
  }
  return null
}
