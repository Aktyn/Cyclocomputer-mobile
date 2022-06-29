import { blueGrey, cyan } from 'material-ui-colors'
import { ImageStyle, StyleSheet, TextStyle, View } from 'react-native'
import { List, Text, TouchableRipple } from 'react-native-paper'

interface NavigationButtonProps {
  label: string
  icon?: string
  active?: boolean
  onClick: () => void
}

export const NavigationButton = ({
  label,
  icon,
  active,
  onClick,
}: NavigationButtonProps) => {
  return (
    <View style={active ? styles.activeContainer : styles.container}>
      <TouchableRipple onPress={onClick} rippleColor="#fff6" disabled={active}>
        <View pointerEvents="none" style={styles.button}>
          {icon && (
            <List.Icon
              icon={icon}
              style={styles.icon}
              color={active ? cyan[200] : null}
            />
          )}
          <Text style={active ? styles.activeLabel : styles.label}>
            {label}
          </Text>
        </View>
      </TouchableRipple>
    </View>
  )
}

const containerStyles: ImageStyle = {
  flexGrow: 1,
  flexBasis: 0,
  alignItems: 'stretch',
  borderLeftWidth: 0.5,
  borderRightWidth: 0.5,
  borderColor: blueGrey[800],
}

const labelStyles: TextStyle = {
  fontSize: 16,
  fontWeight: 'bold',
  paddingRight: 8,
}

const styles = StyleSheet.create({
  container: {
    ...containerStyles,
    backgroundColor: blueGrey[500],
  },
  activeContainer: containerStyles,
  icon: {
    margin: 0,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingVertical: 8,
  },
  label: labelStyles,
  activeLabel: {
    ...labelStyles,
    color: cyan[200],
  },
})
