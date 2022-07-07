import React from 'react'
import { StyleSheet } from 'react-native'
import { Button, Dialog, Portal } from 'react-native-paper'
import { useSettings } from '../../hooks/useSettings'
import { Settings } from './Settings'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

export const SettingsDialog = ({ open, onClose }: SettingsDialogProps) => {
  const { settings, setSetting } = useSettings()

  return (
    <Portal>
      <Dialog style={styles.dialog} visible={open} onDismiss={onClose}>
        <Dialog.Title>Settings</Dialog.Title>
        <Dialog.ScrollArea>
          {settings && <Settings settings={settings} setSetting={setSetting} />}
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button dark mode="contained" icon="close" onPress={onClose}>
            Close
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  )
}

const styles = StyleSheet.create({
  dialog: {
    height: '95%',
  },
})
