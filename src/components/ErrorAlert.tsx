import { StyleSheet, View } from 'react-native'
import { Surface, Text, useTheme } from 'react-native-paper'
import Alert from '../icons/alert-circle.svg'

interface ErrorAlertProps {
  message: string
}

export const ErrorAlert = ({ message }: ErrorAlertProps) => {
  const theme = useTheme()

  return (
    <View style={styles.main}>
      <Surface
        style={{
          ...styles.alert,
          backgroundColor: theme.colors.errorContainer,
        }}
        elevation={2}
      >
        <Alert width={40} height={40} fill={theme.colors.onErrorContainer} />
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onErrorContainer, marginLeft: 8 }}
        >
          {message}
        </Text>
      </Surface>
    </View>
  )
}

const styles = StyleSheet.create({
  main: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
  },
  alert: {
    padding: 8,
    borderRadius: 4,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
})
