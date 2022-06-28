import React, { useEffect, useState } from 'react'
import { blueGrey, lightGreen } from 'material-ui-colors'
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
} from 'react-native'
import { Button, Title, List } from 'react-native-paper'
import { useBluetooth } from '../bluetooth/Bluetooth'

type ListIconProps = {
  color: string
  style: {
    marginLeft: number
    marginRight: number
    marginVertical?: number | undefined
  }
}

const DeviceListIcon = (props: ListIconProps) => (
  <List.Icon {...props} icon="devices" color={blueGrey[50]} />
)

export const ScanningView = () => {
  const {
    bluetoothEnabled,
    requestBluetoothEnable,
    scanning,
    scan,
    connectToDevice,
    devices,
    connectedDevices,
  } = useBluetooth()
  const [connecting, setConnecting] = useState(false)
  const [enablingBluetooth, setEnablingBluetooth] = useState(false)

  // Automatically scan for devices
  useEffect(() => {
    if (bluetoothEnabled) {
      scan()
    }
  }, [bluetoothEnabled, scan])

  const handleConnectToDevice = (device: typeof devices[number]) => {
    setConnecting(true)
    connectToDevice(device).finally(() => setConnecting(false))
  }

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
                color: connected ? lightGreen[300] : blueGrey[100],
              }

              return (
                <List.Item
                  key={device.id}
                  title={
                    connecting ? `${device.name} -> Connecting...` : device.name
                  }
                  titleStyle={textStyle}
                  descriptionStyle={textStyle}
                  description={`ID: ${device.id}${
                    device.paired ? ' (paired)' : ''
                  }`}
                  left={DeviceListIcon}
                  disabled={connecting || connected}
                  onPress={() => {
                    if (connecting || connected) {
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
