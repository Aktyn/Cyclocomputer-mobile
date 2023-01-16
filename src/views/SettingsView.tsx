import { StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'

interface SettingsViewProps {
  onReturn: () => void
}

export function SettingsView({ onReturn }: SettingsViewProps) {
  return (
    <View style={styles.container}>
      <Text>Settings - TODO</Text>
      <Button mode="contained" icon="chevron-left" onPress={onReturn}>
        Return to map
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexGrow: 1,
    flex: 1,
    alignItems: 'center',
  },
})
