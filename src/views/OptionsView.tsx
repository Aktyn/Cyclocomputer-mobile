import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ScrollView, StyleSheet } from 'react-native'
import { TextInput } from 'react-native-paper'
import { useBluetooth } from '../bluetooth/Bluetooth'
import { MessageType } from '../bluetooth/message'
import { useSnackbar } from '../snackbar/Snackbar'
import { float } from '../utils'

const removeNonNumericCharacters = (value: string) =>
  value.replace(/[^\d,.]/g, '')

export const OptionsView = () => {
  const { openSnackbar } = useSnackbar()

  const { connectedDevices, sendData } = useBluetooth()
  const cyclocomputer = connectedDevices[0] ?? { id: 'mock' }

  const [circumferenceText, setCircumferenceText] = useState('')

  const sendCircumferenceUpdate = useCallback(
    (value: number) => {
      sendData(
        cyclocomputer.id,
        MessageType.SET_CIRCUMFERENCE,
        new Uint8Array(Float32Array.from([value]).buffer),
      ).then((success) => {
        if (success) {
          openSnackbar({ message: 'Circumference updated' })
        }
      })
    },
    [cyclocomputer.id, openSnackbar, sendData],
  )

  useEffect(() => {
    AsyncStorage.getItem('@circumference')
      .then((value) => {
        setCircumferenceText(value || '')
        if (value) {
          sendCircumferenceUpdate(float(value))
        }
      })
      .catch((error) => {
        openSnackbar({
          message: `Cannot read circumference value: ${
            error instanceof Error ? error.message : String(error)
          }`,
        })
      })
  }, [openSnackbar, sendCircumferenceUpdate])

  const handleCircumferenceUpdate = useCallback(
    async (text: string) => {
      const circumference = float(text.replace(/^0*/g, '').replace(/,/g, '.'))
      if (!circumference) {
        return
      }
      sendCircumferenceUpdate(circumference)
      await AsyncStorage.setItem('@circumference', circumference.toString())

      setCircumferenceText(circumference.toString())
    },
    [sendCircumferenceUpdate],
  )

  return (
    <ScrollView style={styles.container}>
      <TextInput
        label="Circumference (cm)"
        value={circumferenceText}
        mode="outlined"
        // autoFocus
        left={<TextInput.Icon name="circle-edit-outline" />}
        maxLength={6}
        keyboardType="numeric"
        onChangeText={(value) =>
          setCircumferenceText(removeNonNumericCharacters(value))
        }
        onBlur={() =>
          handleCircumferenceUpdate(circumferenceText).catch((error) => {
            openSnackbar({
              message: `Error while updating circumference: ${
                error instanceof Error ? error.message : String(error)
              }`,
            })
          })
        }
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
