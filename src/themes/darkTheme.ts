import { blueGrey, cyan, deepOrange, grey, red } from 'material-ui-colors'
import { DarkTheme as DefaultTheme } from 'react-native-paper'
import type { Theme } from 'react-native-paper/lib/typescript/types'

export const darkTheme: Theme = {
  ...DefaultTheme,
  dark: true,
  mode: 'exact',
  roundness: 4,
  colors: {
    ...DefaultTheme.colors,
    background: blueGrey[700],
    text: blueGrey[50],
    primary: cyan[400],
    accent: deepOrange[200],
    surface: cyan[600],
    error: red[400],
    onSurface: cyan[800],
    disabled: grey[400],
    placeholder: blueGrey[200],
    backdrop: blueGrey[900] + 'bb',
    notification: 'pink',
  },
}
