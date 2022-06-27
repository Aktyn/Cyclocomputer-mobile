import React, { useState } from 'react'
import { blueGrey, lightGreen } from 'material-ui-colors'
import { StyleProp, StyleSheet, TextStyle, View } from 'react-native'
import { State } from 'react-native-ble-plx'
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
    bluetoothState,
    scanning,
    toggleScanning,
    detectedDevices,
    connectedDevices,
    connectToDevice,
  } = useBluetooth()
  const [lockButton, setLockButton] = useState(false)
  const [connecting, setConnecting] = useState(false)

  const bluetoothEnabled = bluetoothState === State.PoweredOn

  const handleConnectToDevice = (deviceId: string) => {
    setConnecting(true)
    connectToDevice(deviceId).finally(() => setConnecting(false))
  }

  return (
    <View style={styles.container}>
      {!bluetoothEnabled ? (
        <Title style={{ padding: 24, textAlign: 'center' }}>
          Bluetooth is turned off{'\n'}You better change it ;)
        </Title>
      ) : !detectedDevices.length ? (
        <Title style={{ padding: 24, textAlign: 'center' }}>
          No bluetooth devices detected{'\n'}Scan devices to find some!
        </Title>
      ) : (
        detectedDevices.map((device) => {
          const connected = connectedDevices.some((d) => d.id === device.id)
          const textStyle: StyleProp<TextStyle> = {
            color: connected ? lightGreen[300] : blueGrey[100],
          }

          return (
            <View key={device.id}>
              <Title style={{ padding: 24, textAlign: 'center' }}>
                Find Pico-BLE device in below list to establish connection
                {'\n'}It&apos;s best to stop scanning before connecting
              </Title>
              <List.Item
                title={
                  connecting ? `${device.name} -> Connecting...` : device.name
                }
                titleStyle={textStyle}
                descriptionStyle={textStyle}
                description={`ID: ${device.id}`}
                left={DeviceListIcon}
                disabled={connecting || connected}
                onPress={() => {
                  if (connecting || connected) {
                    return
                  }
                  handleConnectToDevice(device.id)
                }}
              />
            </View>
          )
        })
      )}
      <Button
        dark
        style={{ borderRadius: 0 }}
        labelStyle={{ fontSize: 18, padding: 16 }}
        icon="camera"
        mode="contained"
        disabled={!bluetoothEnabled || lockButton}
        onPress={() => {
          setLockButton(true)
          toggleScanning(!scanning).finally(() => setLockButton(false))
        }}
        loading={scanning}
      >
        {scanning ? 'Stop scanning' : 'Scan devices'}
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
