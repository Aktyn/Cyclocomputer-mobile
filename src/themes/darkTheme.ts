import { blueGrey, cyan, deepOrange } from 'material-ui-colors'
import { DarkTheme as DefaultTheme } from 'react-native-paper'
import { Theme } from 'react-native-paper/lib/typescript/types'

export const darkTheme: Theme = {
  ...DefaultTheme,
  dark: true,
  mode: 'exact',
  roundness: 2,
  colors: {
    ...DefaultTheme.colors,
    background: blueGrey[700],
    text: blueGrey[50],
    primary: cyan[400],
    accent: deepOrange[200],
    surface: '#f00',
    error: '#f00',
    onSurface: '#f00',
    disabled: '#f00',
    placeholder: '#f00',
    backdrop: '#f00',
    notification: '#f00',
  },
}
