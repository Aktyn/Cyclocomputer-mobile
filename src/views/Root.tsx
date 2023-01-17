import { useEffect, useState } from 'react'
import * as Device from 'expo-device'
import { DebugView } from './DebugView'
import { MapView } from './MapView'
import { SettingsView } from './SettingsView'
import { TourSelectionView } from './TourSelectionView'
import { useAppState } from '../hooks/useAppState'

enum VIEW {
  MAP,
  TOUR_SELECTION,
  SETTINGS,
  DEBUG,
}

export const Root = () => {
  const [view, setView] = useState(VIEW.TOUR_SELECTION)
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
    case VIEW.TOUR_SELECTION:
      return <TourSelectionView onFinish={() => setView(VIEW.MAP)} />
    case VIEW.MAP:
      return (
        <MapView
          onOpenSettings={() => setView(VIEW.SETTINGS)}
          onOpenDebugView={() => setView(VIEW.DEBUG)}
        />
      )
    case VIEW.SETTINGS:
      return <SettingsView onReturn={() => setView(VIEW.MAP)} />
    case VIEW.DEBUG:
      return <DebugView onReturn={() => setView(VIEW.MAP)} />
  }
}
