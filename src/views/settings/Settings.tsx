import React, { useCallback, useEffect, useMemo, useState } from 'react'
import * as DocumentPicker from 'expo-document-picker'
import { LocationAccuracy } from 'expo-location'
import { ScrollView, StyleSheet, View } from 'react-native'
import {
  RadioButton,
  Text,
  TextInput,
  Title,
  useTheme,
} from 'react-native-paper'
import useCancellablePromise from '../../hooks/useCancellablePromise'
import type { SetSetting, SettingsSchema } from '../../settings'
import { float, int } from '../../utils'

const accuracies = [
  { label: 'Lowest', value: LocationAccuracy.Lowest },
  { label: 'Low', value: LocationAccuracy.Low },
  { label: 'Balanced', value: LocationAccuracy.Balanced },
  { label: 'High', value: LocationAccuracy.High },
  { label: 'Highest', value: LocationAccuracy.Highest },
  { label: 'BestForNavigation', value: LocationAccuracy.BestForNavigation },
]

const removeNonNumericCharacters = (value: string) =>
  value.replace(/[^\d,.]/g, '')

interface SettingsProps {
  settings: SettingsSchema
  setSetting: SetSetting
}

export const Settings = ({ settings, setSetting }: SettingsProps) => {
  const theme = useTheme()
  const cancellable = useCancellablePromise()

  const [circumferenceText, setCircumferenceText] = useState('')
  const [mapZoomText, setMapZoomText] = useState('')

  const selectTourFile = () => {
    cancellable(
      DocumentPicker.getDocumentAsync({
        type: ['application/gpx+xml', 'application/octet-stream'],
      }),
    )
      .then((data) => {
        if (data.type === 'cancel') {
          throw data
        }
        setSetting('gpxFile', data)
      })
      .catch(() => undefined)
  }

  useEffect(() => {
    setCircumferenceText(settings.circumference.toString())
  }, [settings.circumference])
  useEffect(() => {
    setMapZoomText(settings.mapZoom.toString())
  }, [settings.mapZoom])

  const handleCircumferenceUpdate = useCallback(
    (text: string) => {
      const circumference = float(text.replace(/^0*/g, '').replace(/,/g, '.'))
      if (!circumference) {
        return
      }
      setSetting('circumference', circumference)
    },
    [setSetting],
  )

  const handleMapZoomUpdate = useCallback(
    (text: string) => {
      const mapZoom = int(text.replace(/[^\d]/g, ''))
      if (!mapZoom) {
        return
      }
      setSetting('mapZoom', mapZoom)
    },
    [setSetting],
  )

  const textInputStyle = useMemo(
    () => ({ backgroundColor: theme.colors.surface }),
    [theme.colors.surface],
  )

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
    >
      <View style={styles.textBoxes}>
        <TextInput
          style={textInputStyle}
          label="Circumference (cm)"
          value={circumferenceText}
          mode="outlined"
          left={<TextInput.Icon name="circle-edit-outline" />}
          maxLength={6}
          keyboardType="numeric"
          onChangeText={(value) =>
            setCircumferenceText(removeNonNumericCharacters(value))
          }
          onBlur={() => handleCircumferenceUpdate(circumferenceText)}
        />
        <TextInput
          style={textInputStyle}
          label="Tour"
          value={settings.gpxFile?.name ?? ''}
          mode="outlined"
          left={<TextInput.Icon name="map-marker-path" />}
          onPressIn={selectTourFile}
          caretHidden
        />
        <TextInput
          style={textInputStyle}
          label="Map zoom"
          value={mapZoomText}
          mode="outlined"
          left={<TextInput.Icon name="circle-edit-outline" />}
          maxLength={6}
          keyboardType="numeric"
          onChangeText={(value) =>
            setMapZoomText(removeNonNumericCharacters(value))
          }
          onBlur={() => handleMapZoomUpdate(mapZoomText)}
        />
      </View>
      <View style={styles.gpsAccuracyView}>
        <Title>GPS accuracy</Title>
        {accuracies.map((accuracy) => (
          <View key={accuracy.value} style={styles.gpsAccuracyRadioRow}>
            <RadioButton
              key={accuracy.value}
              value={accuracy.value.toString()}
              status={
                settings.gpsAccuracy === accuracy.value
                  ? 'checked'
                  : 'unchecked'
              }
              onPress={() => setSetting('gpsAccuracy', accuracy.value)}
            />
            <Text onPress={() => setSetting('gpsAccuracy', accuracy.value)}>
              {accuracy.label}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    paddingVertical: 8,
  },
  scrollView: {
    width: '100%',
    flex: 1,
  },
  textBoxes: {
    width: '100%',
  },
  gpsAccuracyView: {
    marginTop: 24,
    display: 'flex',
  },
  gpsAccuracyRadioRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
})
