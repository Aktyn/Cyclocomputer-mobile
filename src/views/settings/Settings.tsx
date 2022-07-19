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
import type { SettingsSchema } from '../../core/settings'
import { useMounted } from '../../hooks/useMounted'
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
  setSetting: (
    key: keyof SettingsSchema,
    value: SettingsSchema[typeof key],
  ) => void
}

export const Settings = ({ settings, setSetting }: SettingsProps) => {
  const theme = useTheme()
  const mounted = useMounted()

  const [circumferenceText, setCircumferenceText] = useState('')
  const [gpsTimeIntervalText, setGpsTimeIntervalText] = useState('')
  const [gpsDistanceSensitivityText, setGpsDistanceSensitivityText] =
    useState('')
  const [mapZoomText, setMapZoomText] = useState('')

  const selectTourFile = useCallback(() => {
    if (!mounted) {
      return
    }
    DocumentPicker.getDocumentAsync({
      type: ['application/gpx+xml', 'application/octet-stream'],
    })
      .then((data) => {
        if (data.type === 'cancel') {
          throw data
        }
        setSetting('gpxFile', data)
      })

      .catch((error) =>
        // eslint-disable-next-line no-console
        console.error(
          `Cannot load gpx file. Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      )
  }, [mounted, setSetting])

  useEffect(() => {
    setCircumferenceText(settings.circumference.toString())
  }, [settings.circumference])
  useEffect(() => {
    setGpsTimeIntervalText(settings.gpsTimeInterval.toString())
  }, [settings.gpsTimeInterval])
  useEffect(() => {
    setGpsDistanceSensitivityText(settings.gpsDistanceSensitivity.toString())
  }, [settings.gpsDistanceSensitivity])
  useEffect(() => {
    setMapZoomText(settings.mapZoom.toString())
  }, [settings.mapZoom])

  const handleFloatValueUpdate = useCallback(
    (textValue: string, settingKey: keyof SettingsSchema) => {
      const value = float(textValue.replace(/^0*/g, '').replace(/,/g, '.'))
      if (!value) {
        return
      }
      setSetting(settingKey, value)
    },
    [setSetting],
  )

  const handleIntegerValueUpdate = useCallback(
    (text: string, settingsKey: keyof SettingsSchema) => {
      const value = int(text.replace(/[^\d]/g, ''))
      if (!value) {
        return
      }
      setSetting(settingsKey, value)
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
          onBlur={() =>
            handleFloatValueUpdate(circumferenceText, 'circumference')
          }
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
          left={<TextInput.Icon name="map" />}
          maxLength={6}
          keyboardType="numeric"
          onChangeText={(value) =>
            setMapZoomText(removeNonNumericCharacters(value))
          }
          onBlur={() => handleIntegerValueUpdate(mapZoomText, 'mapZoom')}
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
        <TextInput
          style={textInputStyle}
          label="GPS location updates interval (milliseconds)"
          value={gpsTimeIntervalText}
          mode="outlined"
          left={<TextInput.Icon name="map-clock" />}
          maxLength={9}
          keyboardType="numeric"
          onChangeText={(value) =>
            setGpsTimeIntervalText(removeNonNumericCharacters(value))
          }
          onBlur={() =>
            handleIntegerValueUpdate(gpsTimeIntervalText, 'gpsTimeInterval')
          }
        />
        <TextInput
          style={textInputStyle}
          label="GPS location distance sensitivity (meters)"
          value={gpsDistanceSensitivityText}
          mode="outlined"
          left={<TextInput.Icon name="map-marker-distance" />}
          maxLength={3}
          keyboardType="numeric"
          onChangeText={(value) =>
            setGpsDistanceSensitivityText(removeNonNumericCharacters(value))
          }
          onBlur={() =>
            handleIntegerValueUpdate(
              gpsDistanceSensitivityText,
              'gpsDistanceSensitivity',
            )
          }
        />
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
