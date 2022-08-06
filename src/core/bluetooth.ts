import EventEmitter from 'events'
import { Buffer } from '@craftzdog/react-native-buffer'
import type { EmitterSubscription } from 'react-native'
import BluetoothSerial from 'react-native-bluetooth-serial-next'
import { waitFor } from '../utils'
import { requestBluetoothPermissions } from './common'
import type { IncomingMessageType, MessageType } from './message'
import { STAMP } from './message'

const DEVICE_DATA_READ_FREQUENCY = 1000

const isStamp = (data: Uint8Array) => {
  if (data.length !== STAMP.byteLength) {
    return false
  }
  for (let i = 0; i < data.length; i++) {
    if (data[i] !== STAMP[i]) {
      return false
    }
  }

  return true
}

type MessageListener = (message: IncomingMessageType, data: Uint8Array) => void

export interface DeviceInfo extends BluetoothSerial.AndroidBluetoothDevice {
  paired: boolean
}

type DeviceEventCallback = (
  device: BluetoothSerial.AndroidBluetoothDevice,
) => void

declare interface BluetoothEventEmitter {
  on(event: 'toggleBluetooth', listener: (isEnabled: boolean) => void): this
  on(event: 'scanning', listener: (isScanning: boolean) => void): this
  on(
    event: 'discoveredDevices',
    listener: (devices: DeviceInfo[]) => void,
  ): this
  on(event: 'deviceConnected', listener: DeviceEventCallback): this
  on(event: 'deviceDisconnected', listener: DeviceEventCallback): this
  on(event: 'message', listener: MessageListener): this

  off(event: 'toggleBluetooth', listener: (isEnabled: boolean) => void): this
  off(event: 'scanning', listener: (isScanning: boolean) => void): this
  off(
    event: 'discoveredDevices',
    listener: (devices: DeviceInfo[]) => void,
  ): this
  off(event: 'deviceConnected', listener: DeviceEventCallback): this
  off(event: 'deviceDisconnected', listener: DeviceEventCallback): this
  off(event: 'message', listener: MessageListener): this

  emit(event: 'toggleBluetooth', enable: boolean): boolean
  emit(event: 'scanning', isScanning: boolean): boolean
  emit(event: 'discoveredDevices', devices: DeviceInfo[]): boolean
  emit(
    event: 'deviceConnected',
    device: BluetoothSerial.AndroidBluetoothDevice,
  ): boolean
  emit(
    event: 'deviceDisconnected',
    device: BluetoothSerial.AndroidBluetoothDevice,
  ): boolean
  emit(event: 'message', message: IncomingMessageType, data: Uint8Array): void
}

class BluetoothEventEmitter extends EventEmitter {}

export class Bluetooth extends BluetoothEventEmitter {
  private enabled = false
  private scanning = false
  private devices: DeviceInfo[] = []
  private connectedDevices: BluetoothSerial.AndroidBluetoothDevice[] = []
  private rawDataBuffer = ''
  private isDataSendingBusy = false

  private readonly bluetoothSerialSubscriptions: EmitterSubscription[] = []
  private readonly deviceDataReadIntervals = new Map<
    string,
    ReturnType<typeof setInterval>
  >()

  constructor() {
    super()

    BluetoothSerial.isEnabled()
      .then((enabled) => {
        if (enabled !== this.enabled) {
          this.handleBluetoothToggle(enabled)
        }
      })
      .catch(() => undefined)

    type DeviceCallback = (data: {
      device?: BluetoothSerial.AndroidBluetoothDevice
    }) => void

    const handleBluetoothEnabled = () => this.handleBluetoothToggle(true)
    const handleBluetoothDisabled = () => this.handleBluetoothToggle(false)

    const onDeviceDisconnected = (
      device: BluetoothSerial.AndroidBluetoothDevice,
    ) => {
      this.connectedDevices = this.connectedDevices.filter(
        ({ id }) => id !== device.id,
      )
      this.emit('deviceDisconnected', device)

      const deviceDataReadInterval = this.deviceDataReadIntervals.get(device.id)
      if (deviceDataReadInterval) {
        clearInterval(deviceDataReadInterval)
        this.deviceDataReadIntervals.delete(device.id)
      }
    }
    const handleConnectionSuccess: DeviceCallback = ({
      device: deviceInfo,
    }) => {
      if (deviceInfo) {
        this.connectedDevices = [...this.connectedDevices, deviceInfo]
        // eslint-disable-next-line no-console
        console.log(`Successfully connected to ${deviceInfo.name}`)
        this.emit('deviceConnected', deviceInfo)

        let reading = false
        const interval = setInterval(async () => {
          if (reading) {
            return
          }
          reading = true
          BluetoothSerial.device(deviceInfo.id)
            .readFromDevice()
            .then((data) => {
              if (data) {
                this.handleDeviceData(data)
              }
            })
            .finally(() => (reading = false))
        }, DEVICE_DATA_READ_FREQUENCY)
        this.deviceDataReadIntervals.set(deviceInfo.id, interval)
      }
    }
    const handleConnectionFailed: DeviceCallback = ({ device }) => {
      if (device) {
        onDeviceDisconnected(device)
        // eslint-disable-next-line no-console
        console.log(`Connection to ${device.name} failed`)
      }
    }
    const handleConnectionLost: DeviceCallback = ({ device }) => {
      if (device) {
        onDeviceDisconnected(device)
        // eslint-disable-next-line no-console
        console.log(`Connection to ${device.name} lost`)
      }
    }
    const handleError = (e: Error) => {
      // eslint-disable-next-line no-console
      console.error(`Bluetooth error: ${e.message}`)
    }

    requestBluetoothPermissions()
      .then((permission) => {
        if (!permission) {
          // eslint-disable-next-line no-console
          console.error('Bluetooth permission denied')
          return false
        }

        return BluetoothSerial.isEnabled()
      })
      .then((enabled) =>
        enabled ? handleBluetoothEnabled() : handleBluetoothDisabled(),
      )

    this.bluetoothSerialSubscriptions.push(
      BluetoothSerial.on('bluetoothEnabled', handleBluetoothEnabled),
      BluetoothSerial.on('bluetoothDisabled', handleBluetoothDisabled),
      BluetoothSerial.on('connectionSuccess', handleConnectionSuccess),
      BluetoothSerial.on('connectionFailed', handleConnectionFailed),
      BluetoothSerial.on('connectionLost', handleConnectionLost),
      BluetoothSerial.on('error', handleError),
    )
  }

  async destroy() {
    // for (const deviceInfo of this.connectedDevices) {
    //   // eslint-disable-next-line no-console
    //   console.log(
    //     'Disconnecting from device',
    //     deviceInfo.name,
    //     'id:',
    //     deviceInfo.id,
    //   )
    //   const device = BluetoothSerial.device(deviceInfo.id)
    //   await device.disconnect()
    //   // eslint-disable-next-line no-console
    //   console.log('\tdisconnected')
    // }
    this.bluetoothSerialSubscriptions.forEach((subscription) =>
      subscription.remove(),
    )
    BluetoothSerial.removeAllListeners()

    for (const interval of this.deviceDataReadIntervals.values()) {
      clearInterval(interval)
    }
    this.deviceDataReadIntervals.clear()

    super.removeAllListeners()
  }

  isEnabled() {
    return this.enabled
  }

  isScanning() {
    return this.scanning
  }

  getDiscoveredDevices() {
    return this.devices
  }

  getConnectedDevices() {
    return this.connectedDevices
  }

  private handleBluetoothToggle(enabled: boolean) {
    this.enabled = enabled
    this.emit('toggleBluetooth', enabled)
  }

  private handleDeviceData(rawData: string) {
    this.rawDataBuffer += rawData

    const bytes = Uint8Array.from(Buffer.from(this.rawDataBuffer, 'base64'))
    // eslint-disable-next-line no-console
    console.log(rawData, bytes.join(', '))
    if (bytes.length < STAMP.byteLength) {
      return
    }

    if (!isStamp(bytes.slice(0, STAMP.byteLength))) {
      this.rawDataBuffer = ''
      return
    }

    if (bytes.length < STAMP.byteLength + 5) {
      return
    }

    const message = bytes[STAMP.byteLength] as IncomingMessageType
    const dataSize =
      (bytes[STAMP.byteLength + 1] << 0) |
      (bytes[STAMP.byteLength + 2] << 8) |
      (bytes[STAMP.byteLength + 3] << 16) |
      (bytes[STAMP.byteLength + 4] << 24)
    const end = Math.min(bytes.length, STAMP.byteLength + 5 + dataSize)
    const data = bytes.slice(STAMP.byteLength + 5, end)

    this.rawDataBuffer =
      end >= bytes.length
        ? ''
        : Buffer.from(bytes.slice(end).buffer).toString('base64')

    // eslint-disable-next-line no-console
    console.log('New message:', message, 'data:', data.join(', '))

    this.emit('message', message, data)
  }

  async requestEnable() {
    try {
      await BluetoothSerial.requestEnable()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Cannot enable bluetooth')
    }
  }

  async scan(timeout = 30000) {
    this.scanning = true
    this.emit('scanning', true)
    let timedOut = false
    const tm = setTimeout(() => {
      timedOut = true
      this.scanning = false
      this.emit('scanning', false)
      BluetoothSerial.cancelDiscovery()
    }, timeout)

    try {
      const discoveredDevices: DeviceInfo[] = []

      const paired =
        (await BluetoothSerial.list()) as BluetoothSerial.AndroidBluetoothDevice[]
      discoveredDevices.push(
        ...paired.filter((p) => !!p.name).map((p) => ({ ...p, paired: true })),
      )
      this.devices = discoveredDevices
      this.emit('discoveredDevices', discoveredDevices)

      const unpaired =
        (await BluetoothSerial.discoverUnpairedDevices()) as BluetoothSerial.AndroidBluetoothDevice[]
      discoveredDevices.push(
        ...unpaired
          .filter(
            (p) => !!p.name && !discoveredDevices.find((d) => d.id === p.id),
          )
          .map((p) => ({ ...p, paired: false })),
      )
      this.devices = discoveredDevices
      this.emit('discoveredDevices', discoveredDevices)

      if (timedOut) {
        throw new Error('Timeout')
      }
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error(
        `Error occurred while scanning for devices: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
    clearTimeout(tm)
    this.scanning = false
    this.emit('scanning', false)
  }

  async connectToDevice(deviceInfo: DeviceInfo) {
    try {
      if (!deviceInfo.paired) {
        await BluetoothSerial.pairDevice(deviceInfo.id)
      }

      const device = BluetoothSerial.device(deviceInfo.id)
      await device.connect()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`Cannot connect to device ${deviceInfo.name}`)
    }
  }

  async sendData(
    deviceId: string,
    type: MessageType,
    data: string | ArrayBuffer,
  ) {
    //Prevent for simultaneous data sending
    if (this.isDataSendingBusy) {
      await waitFor(() => this.isDataSendingBusy === false)
    }
    this.isDataSendingBusy = true
    try {
      const device = BluetoothSerial.device(deviceId)
      const rawDataLength =
        typeof data === 'string' ? data.length : data.byteLength
      const buffer = Buffer.concat([
        STAMP,
        Buffer.from(Uint8Array.from([type])),
        Buffer.from(new Uint8Array(Uint32Array.from([rawDataLength]).buffer)),
        Buffer.from(data as never),
      ])

      // eslint-disable-next-line no-console
      console.log('Sending message:', type, 'data size:', buffer.byteLength)

      const result = await device.write(buffer as never)
      // await wait(100) // 100 ms delay after each message is sent
      this.isDataSendingBusy = false
      return result
    } catch (error: unknown) {
      this.isDataSendingBusy = false
      // eslint-disable-next-line no-console
      console.error(
        `Cannot send data to device: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
      return false
    }
  }
}
