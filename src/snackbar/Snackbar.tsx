import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useState,
} from 'react'
import { Snackbar } from 'react-native-paper'
import uuid from 'react-native-uuid'

const noop = () => undefined

interface SnackbarOptions {
  message: string
}

interface SnackbarInterface {
  openSnackbar: (options: SnackbarOptions) => void
}

const SnackbarContext = createContext<SnackbarInterface>({
  openSnackbar: noop,
})

export const useSnackbar = () => {
  const context = useContext(SnackbarContext)
  return context
}

export const SnackbarProvider: FC<PropsWithChildren<unknown>> = ({
  children,
}) => {
  const [snackbars, setSnackbars] = useState<
    { id: string; options: SnackbarOptions }[]
  >([])

  const openSnackbar = (options: SnackbarOptions) => {
    setSnackbars((s) => [...s, { id: uuid.v4() as string, options }])
  }

  return (
    <SnackbarContext.Provider value={{ openSnackbar }}>
      {children}
      {snackbars.map(({ id, options }) => (
        <Snackbar
          key={id}
          visible
          onDismiss={() =>
            setSnackbars((items) => items.filter((s) => s.id !== id))
          }
          // action={{
          //   label: 'Dismiss',
          //   onPress: () => {
          //     // Do something
          //   },
          // }}
        >
          {options.message}
        </Snackbar>
      ))}
    </SnackbarContext.Provider>
  )
}