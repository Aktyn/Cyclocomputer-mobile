import { useEffect, useMemo, useRef, useState } from 'react'
import { Core } from '../core'
import type { DeviceInfo } from '../core/bluetooth'

export function useBluetooth() {
  const bluetoothMethodsRef = useRef({
    requestBluetoothEnable: Core.instance.bluetooth.requestEnable.bind(
      Core.instance.bluetooth,
    ),
    scan: Core.instance.bluetooth.scan.bind(Core.instance.bluetooth),
    connectToDevice: Core.instance.bluetooth.connectToDevice.bind(
      Core.instance.bluetooth,
    ),
    sendData: Core.instance.bluetooth.sendData.bind(Core.instance.bluetooth),
  })

  const [bluetoothEnabled, setBluetoothEnabled] = useState(
    Core.instance.bluetooth.isEnabled(),
  )
  const [scanning, setScanning] = useState(Core.instance.bluetooth.isScanning())
  const [devices, setDevices] = useState(
    Core.instance.bluetooth.getDiscoveredDevices(),
  )
  const [connectedDevices, setConnectedDevices] = useState(
    Core.instance.bluetooth.getConnectedDevices(),
  )

  useEffect(() => {
    const handleBluetoothToggle = (enabled: boolean) =>
      setBluetoothEnabled(enabled)
    const handleScanningToggle = (isScanning: boolean) =>
      setScanning(isScanning)
    const handleDiscoveredDevices = (discoveredDevices: DeviceInfo[]) =>
      setDevices([...discoveredDevices]) //Make copy of array for immutability
    const handleConnectedDevicesChange = () =>
      setConnectedDevices(Core.instance.bluetooth.getConnectedDevices())

    Core.instance.bluetooth.on('toggleBluetooth', handleBluetoothToggle)
    Core.instance.bluetooth.on('scanning', handleScanningToggle)
    Core.instance.bluetooth.on('discoveredDevices', handleDiscoveredDevices)
    Core.instance.bluetooth.on('deviceConnected', handleConnectedDevicesChange)
    Core.instance.bluetooth.on(
      'deviceDisconnected',
      handleConnectedDevicesChange,
    )

    return () => {
      Core.instance.bluetooth.off('toggleBluetooth', handleBluetoothToggle)
      Core.instance.bluetooth.off('scanning', handleScanningToggle)
      Core.instance.bluetooth.off('discoveredDevices', handleDiscoveredDevices)
      Core.instance.bluetooth.off(
        'deviceConnected',
        handleConnectedDevicesChange,
      )
      Core.instance.bluetooth.off(
        'deviceDisconnected',
        handleConnectedDevicesChange,
      )
    }
  }, [])

  const data = useMemo(
    () => ({
      bluetoothEnabled,
      scanning,
      devices: devices.reduce((acc, device) => {
        if (!acc.some(({ id }) => id === device.id)) {
          acc.push(device)
        }
        return acc
      }, [] as DeviceInfo[]),
      connectedDevices,
      ...bluetoothMethodsRef.current,
    }),
    [bluetoothEnabled, connectedDevices, devices, scanning],
  )

  return data
}
