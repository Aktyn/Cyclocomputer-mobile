import React, { useCallback, useEffect, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { blueGrey, cyan, lightGreen } from 'material-ui-colors'
import type { StyleProp, TextStyle } from 'react-native'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Button, Title, List } from 'react-native-paper'
import { useBluetooth } from '../hooks/useBluetooth'
import useCancellablePromise from '../hooks/useCancellablePromise'

type ListIconProps = {
  color: string
  style: {
    marginLeft: number
    marginRight: number
    marginVertical?: number | undefined
  }
}

const DeviceListIcon = (props: ListIconProps) => (
  <List.Icon {...props} icon="devices" color={props.color} />
)

export const ScanningView = () => {
  const mounted = useRef(true)
  const autoConnectAttempt = useRef(false)
  const cancellable = useCancellablePromise()

  const {
    bluetoothEnabled,
    requestBluetoothEnable,
    scanning,
    scan,
    connectToDevice,
    devices,
    connectedDevices,
  } = useBluetooth()

  const [connecting, setConnecting] = useState('')
  const [enablingBluetooth, setEnablingBluetooth] = useState(false)
  const [cyclocomputerID, setCyclocomputerID] = useState<string | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // Automatically scan for devices
  useEffect(() => {
    if (bluetoothEnabled) {
      scan()
    }
  }, [bluetoothEnabled, scan])

  useEffect(() => {
    cancellable(AsyncStorage.getItem('@cyclocomputer-id'))
      .then((cyclocomputerId) => {
        if (cyclocomputerId) {
          setCyclocomputerID(cyclocomputerId)
        }
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error(
          `Cannot read cyclocomputer id: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      })
  }, [cancellable])

  const handleConnectToDevice = useCallback(
    (device: typeof devices[number]) => {
      setConnecting(device.id)
      connectToDevice(device).then((success) => {
        if (!mounted.current) {
          return
        }
        setConnecting('')
        AsyncStorage.setItem(
          '@cyclocomputer-id',
          success ? device.id : '',
        ).catch((error) => {
          // eslint-disable-next-line no-console
          console.error(
            `Cannot set cyclocomputer id: ${
              error instanceof Error ? error.message : String(error)
            }`,
          )
        })
      })
    },
    [connectToDevice, mounted],
  )

  useEffect(() => {
    if (
      connecting ||
      !mounted.current ||
      connectedDevices.length > 0 ||
      scanning ||
      autoConnectAttempt.current
    ) {
      return
    }
    const cyclocomputerDevice = devices.find(({ id }) => id === cyclocomputerID)
    if (cyclocomputerDevice) {
      // eslint-disable-next-line no-console
      console.log('Auto connecting to device:', cyclocomputerDevice.id)
      autoConnectAttempt.current = true
      handleConnectToDevice(cyclocomputerDevice)
    }
  }, [
    connectedDevices.length,
    connecting,
    cyclocomputerID,
    devices,
    handleConnectToDevice,
    scanning,
  ])

  return (
    <View style={styles.container}>
      {!bluetoothEnabled ? (
        <Title style={{ padding: 24, textAlign: 'center' }}>
          Bluetooth is turned off{'\n'}You better change it ;)
        </Title>
      ) : !devices.length ? (
        <Title style={{ padding: 24, textAlign: 'center' }}>
          No bluetooth devices detected{'\n'}Scan devices to find some!
        </Title>
      ) : (
        <View style={styles.container}>
          <Title style={{ padding: 24, textAlign: 'center' }}>
            Find Cyclocomputer device in below list to establish connection
            {'\n'}It&apos;s best to stop scanning before connecting
          </Title>
          <ScrollView>
            {devices.map((device) => {
              const connected = connectedDevices.some((d) => d.id === device.id)
              const textStyle: StyleProp<TextStyle> = {
                color: connected
                  ? lightGreen[300]
                  : device.id === cyclocomputerID //'2B:0A:DA:99:6C:F7'
                  ? cyan[100]
                  : blueGrey[100],
              }

              return (
                <List.Item
                  key={device.id}
                  title={
                    connecting === device.id
                      ? `${device.name} -> Connecting...`
                      : device.name
                  }
                  titleStyle={textStyle}
                  descriptionStyle={textStyle}
                  description={`ID: ${device.id}${
                    device.paired ? ' (paired)' : ''
                  }`}
                  // eslint-disable-next-line react/no-unstable-nested-components
                  left={(props) => (
                    <DeviceListIcon
                      key={device.id}
                      {...props}
                      color={textStyle.color ?? blueGrey[100]}
                    />
                  )}
                  disabled={!!connecting || connected}
                  onPress={() => {
                    if (!!connecting || connected) {
                      return
                    }
                    handleConnectToDevice(device)
                  }}
                />
              )
            })}
          </ScrollView>
        </View>
      )}
      <Button
        dark
        style={{ borderRadius: 0 }}
        labelStyle={{ fontSize: 18, padding: 16 }}
        icon="camera"
        mode="contained"
        onPress={() => {
          if (!bluetoothEnabled) {
            setEnablingBluetooth(true)
            requestBluetoothEnable().finally(() => setEnablingBluetooth(false))
            return
          }
          if (!scanning) {
            scan()
          }
        }}
        loading={scanning || enablingBluetooth}
      >
        {!bluetoothEnabled
          ? 'Enable bluetooth'
          : scanning
          ? 'Scanning...'
          : 'Scan devices'}
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
    justifyContent: 'space-between',
  },
})
