import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { NavigationButton } from '../components/NavigationButton'
import { MapView } from './MapView'
import { OptionsView } from './OptionsView'

enum VIEW {
  OPTIONS,
  MAP,
}

export const MainView = () => {
  const [view, setView] = useState(VIEW.OPTIONS)

  return (
    <View style={styles.container}>
      {view === VIEW.OPTIONS ? (
        <OptionsView />
      ) : view === VIEW.MAP ? (
        <MapView />
      ) : null}
      <View style={styles.bottomView}>
        <NavigationButton
          label="Options"
          icon="cog"
          active={view === VIEW.OPTIONS}
          onClick={() => setView(VIEW.OPTIONS)}
        />
        <NavigationButton
          label="Map"
          icon="map"
          active={view === VIEW.MAP}
          onClick={() => setView(VIEW.MAP)}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexGrow: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomView: {
    width: '100%',
    flexDirection: 'row',
    marginLeft: -0.5,
    marginRight: -0.5,
  },
})
