import { useEffect, useState } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

function isBackgroundState(state: AppStateStatus) {
  return !!state.match(/inactive|background/)
}

export function useAppState() {
  const [backgroundState, setBackgroundState] = useState(
    isBackgroundState(AppState.currentState),
  )

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // eslint-disable-next-line no-console
      console.log('App state', nextAppState)
      setBackgroundState(isBackgroundState(nextAppState))
    }

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    )
    return () => {
      subscription.remove()
    }
  }, [])

  return { backgroundState }
}
