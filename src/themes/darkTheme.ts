import { blueGrey } from "material-ui-colors";
import { DarkTheme as DefaultTheme } from "react-native-paper";
import { Theme } from "react-native-paper/lib/typescript/types";

export const darkTheme: Theme = {
  ...DefaultTheme,
  dark: true,
  mode: 'exact',
  roundness: 2,
  colors: {
    ...DefaultTheme.colors,
    background: blueGrey[700],
    text: blueGrey[50],
  },
};