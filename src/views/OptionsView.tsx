import { useCallback, useEffect, useState } from 'react'
import * as DocumentPicker from 'expo-document-picker'
import { ScrollView, StyleSheet } from 'react-native'
import { TextInput } from 'react-native-paper'
import { useSettings } from '../settings'
import { float } from '../utils'

const removeNonNumericCharacters = (value: string) =>
  value.replace(/[^\d,.]/g, '')

export const OptionsView = () => {
  const { settings, setSetting } = useSettings()

  const [circumferenceText, setCircumferenceText] = useState('')

  const selectTourFile = () => {
    DocumentPicker.getDocumentAsync({
      type: 'application/octet-stream',
    })
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

  return (
    <ScrollView style={styles.container}>
      <TextInput
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
        label="Tour"
        value={settings.gpxFile?.name ?? ''}
        mode="outlined"
        left={<TextInput.Icon name="map-marker-path" />}
        onPressIn={selectTourFile}
        caretHidden
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
    padding: 16,
  },
})
