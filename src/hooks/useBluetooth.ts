import { useEffect, useMemo, useRef, useState } from 'react'
import { core } from '../core'
import type { DeviceInfo } from '../core/bluetooth'

export function useBluetooth() {
  const bluetoothMethodsRef = useRef({
    requestBluetoothEnable: core.bluetooth.requestEnable.bind(core.bluetooth),
    scan: core.bluetooth.scan.bind(core.bluetooth),
    connectToDevice: core.bluetooth.connectToDevice.bind(core.bluetooth),
    sendData: core.bluetooth.sendData.bind(core.bluetooth),
  })

  const [bluetoothEnabled, setBluetoothEnabled] = useState(
    core.bluetooth.isEnabled(),
  )
  const [scanning, setScanning] = useState(core.bluetooth.isScanning())
  const [devices, setDevices] = useState(core.bluetooth.getDiscoveredDevices())
  const [connectedDevices, setConnectedDevices] = useState(
    core.bluetooth.getConnectedDevices(),
  )

  useEffect(() => {
    const handleBluetoothToggle = (enabled: boolean) =>
      setBluetoothEnabled(enabled)
    const handleScanningToggle = (isScanning: boolean) =>
      setScanning(isScanning)
    const handleDiscoveredDevices = (discoveredDevices: DeviceInfo[]) =>
      setDevices([...discoveredDevices]) //Make copy of array for immutability
    const handleConnectedDevicesChange = () =>
      setConnectedDevices(core.bluetooth.getConnectedDevices())

    core.bluetooth.on('toggleBluetooth', handleBluetoothToggle)
    core.bluetooth.on('scanning', handleScanningToggle)
    core.bluetooth.on('discoveredDevices', handleDiscoveredDevices)
    core.bluetooth.on('deviceConnected', handleConnectedDevicesChange)
    core.bluetooth.on('deviceDisconnected', handleConnectedDevicesChange)

    return () => {
      core.bluetooth.off('toggleBluetooth', handleBluetoothToggle)
      core.bluetooth.off('scanning', handleScanningToggle)
      core.bluetooth.off('discoveredDevices', handleDiscoveredDevices)
      core.bluetooth.off('deviceConnected', handleConnectedDevicesChange)
      core.bluetooth.off('deviceDisconnected', handleConnectedDevicesChange)
    }
  }, [])

  const data = useMemo(
    () => ({
      bluetoothEnabled,
      scanning,
      devices,
      connectedDevices,
      ...bluetoothMethodsRef.current,
    }),
    [bluetoothEnabled, connectedDevices, devices, scanning],
  )

  return data
}
