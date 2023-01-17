import { useState } from 'react'
import { LocationAccuracy } from 'expo-location'
import { ScrollView, StyleSheet, View } from 'react-native'
import {
  Button,
  Divider,
  RadioButton,
  Text,
  TextInput,
} from 'react-native-paper'
import { useDebounce } from '../hooks/useDebounce'
import { useModuleEvent } from '../hooks/useModuleEvent'
import { settingsModule } from '../modules/settings'
import { int } from '../utils'

interface SettingsViewProps {
  onReturn: () => void
}

export function SettingsView({ onReturn }: SettingsViewProps) {
  const [mapZoom, setMapZoom] = useState(settingsModule.settings.mapZoom)
  const [grayscaleTolerance, setGrayscaleTolerance] = useState(
    settingsModule.settings.grayscaleTolerance,
  )
  const [gpsTimeInterval, setGpsTimeInterval] = useState(
    settingsModule.settings.gpsTimeInterval,
  )
  const [gpsDistanceSensitivity, setGpsDistanceSensitivity] = useState(
    settingsModule.settings.gpsDistanceSensitivity,
  )
  const [gpsAccuracy, setGpsAccuracy] = useState(
    settingsModule.settings.gpsAccuracy,
  )

  useModuleEvent(settingsModule, 'singleSettingChange', (key, value) => {
    switch (key) {
      case 'mapZoom':
        setMapZoom(value as number)
        break
      case 'grayscaleTolerance':
        setGrayscaleTolerance(value as number)
        break
      case 'gpsTimeInterval':
        setGpsTimeInterval(value as number)
        break
      case 'gpsDistanceSensitivity':
        setGpsDistanceSensitivity(value as number)
        break
    }
  })

  const setSettingDebounce: typeof settingsModule.setSetting = useDebounce<
    typeof settingsModule.setSetting
  >(
    (key, value) => {
      settingsModule.setSetting(key, value)
    },
    1000,
    [],
  )

  //TODO: reset to defaults button

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.inputsSection}>
          <TextInput
            label="Map zoom"
            value={mapZoom.toString()}
            mode="outlined"
            left={<TextInput.Icon icon="map" />}
            maxLength={2}
            keyboardType="numeric"
            onChangeText={(value) => {
              setSettingDebounce('mapZoom', int(value))
              setMapZoom(int(value))
            }}
          />
          <TextInput
            label="Grayscale tolerance"
            value={grayscaleTolerance.toString()}
            mode="outlined"
            left={<TextInput.Icon icon="image-filter-black-white" />}
            maxLength={3}
            keyboardType="numeric"
            onChangeText={(value) => {
              setSettingDebounce('grayscaleTolerance', int(value))
              setGrayscaleTolerance(int(value))
            }}
          />
        </View>
        <Divider style={styles.divider} />
        <View style={styles.inputsSection}>
          <TextInput
            label="GPS location updates interval (milliseconds)"
            value={gpsTimeInterval.toString()}
            mode="outlined"
            left={<TextInput.Icon icon="map-clock" />}
            maxLength={9}
            keyboardType="numeric"
            onChangeText={(value) => {
              setSettingDebounce('gpsTimeInterval', int(value))
              setGpsTimeInterval(int(value))
            }}
          />
          <TextInput
            label="GPS location distance sensitivity (meters)"
            value={gpsDistanceSensitivity.toString()}
            mode="outlined"
            left={<TextInput.Icon icon="map-marker-distance" />}
            maxLength={3}
            keyboardType="numeric"
            onChangeText={(value) => {
              setSettingDebounce('gpsDistanceSensitivity', int(value))
              setGpsDistanceSensitivity(int(value))
            }}
          />
        </View>
        <Divider style={styles.divider} />
        <View style={styles.inputsSection}>
          <Text variant="titleMedium">GPS accuracy</Text>
          {accuracies.map((accuracy) => (
            <View key={accuracy.value} style={styles.gpsAccuracyRadioRow}>
              <RadioButton
                key={accuracy.value}
                value={accuracy.value.toString()}
                status={
                  gpsAccuracy === accuracy.value ? 'checked' : 'unchecked'
                }
                onPress={() => {
                  setSettingDebounce('gpsAccuracy', accuracy.value)
                  setGpsAccuracy(accuracy.value)
                }}
              />
              <Text
                onPress={() => {
                  setSettingDebounce('gpsAccuracy', accuracy.value)
                  setGpsAccuracy(accuracy.value)
                }}
              >
                {accuracy.label}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.bottomSection}>
        <Button mode="contained" icon="chevron-left" onPress={onReturn}>
          Return to map
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    flexGrow: 1,
    paddingVertical: 16,
    display: 'flex',
    justifyContent: 'space-between',
  },
  divider: {
    marginVertical: 8,
    height: 1,
  },
  gpsAccuracyRadioRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputsSection: { paddingHorizontal: 16 },
  bottomSection: { alignItems: 'center', flexGrow: 0 },
})

const accuracies = [
  { label: 'Lowest', value: LocationAccuracy.Lowest },
  { label: 'Low', value: LocationAccuracy.Low },
  { label: 'Balanced', value: LocationAccuracy.Balanced },
  { label: 'High', value: LocationAccuracy.High },
  { label: 'Highest', value: LocationAccuracy.Highest },
  { label: 'Best for navigation', value: LocationAccuracy.BestForNavigation },
]
