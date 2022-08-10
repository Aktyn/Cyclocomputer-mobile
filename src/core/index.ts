import EventEmitter from 'events'
import { MapGeneratorV2 } from '../mapGeneratorV2'
import { removeDiacritics } from '../utils'
import { Bluetooth } from './bluetooth'
import { parseImageDataV2 } from './common'
import type { Coordinates } from './gps'
import { GPS } from './gps'
import { IncomingMessageType, MessageType } from './message'
import { Progress } from './progress'
import type { SettingsSchema } from './settings'
import { Settings } from './settings'
import { Tour } from './tour'
import type { WeatherSchema } from './weather'
import { Weather } from './weather'

const MAP_PREVIEW_SEND_FREQUENCY = 4000

declare interface CoreEventEmitter {
  on(
    event: 'mapUpdate',
    listener: (data: Uint8Array | Uint8ClampedArray) => void,
  ): this
  off(
    event: 'mapUpdate',
    listener: (data: Uint8Array | Uint8ClampedArray) => void,
  ): this
  emit(event: 'mapUpdate', data: Uint8Array | Uint8ClampedArray): boolean
}

class CoreEventEmitter extends EventEmitter {}

export class Core extends CoreEventEmitter {
  private static coreInstance: Core | null = null

  public static get instance() {
    // if (!Core.coreInstance) {
    //   throw new Error('Core is not initialized')
    // }
    return Core.coreInstance ?? new Core()
  }

  public static isInitialized() {
    return !!Core.coreInstance
  }

  readonly settings = new Settings()
  readonly bluetooth = new Bluetooth()
  readonly gps = new GPS()
  readonly tour = new Tour()
  readonly weather = new Weather()
  readonly progress = new Progress()

  private map: MapGeneratorV2 | null = null
  private updateInfo = {
    updating: false,
    pendingUpdate: null as Coordinates | null,
  }
  private lastMapPreviewSend = 0
  private circumference = 0
  private gpsStatisticsStore = {
    altitude: 0,
    heading: 0,
    slope: 0,
  }
  private lastProgressDataSendTimestamp = 0

  private readonly onCoordinatesUpdate = this.handleCoordinatesUpdate.bind(this)
  private readonly onSettingsChange = this.handleSettingsChange.bind(this)
  private readonly onBluetoothMessage = this.handleBluetoothMessage.bind(this)
  private readonly onBluetoothDeviceConnected =
    this.handleBluetoothDeviceConnected.bind(this)
  private readonly onWeatherUpdate = this.handleWeatherUpdate.bind(this)
  // private readonly onProgressUpdate = this.handleProgressUpdate.bind(this)

  private constructor() {
    if (Core.coreInstance !== null) {
      throw new Error('Only one instance of Core is allowed')
    }
    // eslint-disable-next-line no-console
    console.log('Initializing core')

    super()

    this.tour.setSettings(
      this.settings.getSettings().gpxFile,
      this.settings.getSettings().mapZoom,
    )

    this.circumference = this.settings.getSettings().circumference

    this.bluetooth.on('deviceConnected', this.onBluetoothDeviceConnected)
    this.bluetooth.on('message', this.onBluetoothMessage)
    this.settings.on('settingsChange', this.onSettingsChange)
    this.gps.on('coordinatesUpdate', this.onCoordinatesUpdate)
    this.weather.on('update', this.onWeatherUpdate)
    // this.progress.on('update', this.onProgressUpdate)

    Core.coreInstance = this
  }

  async destroy() {
    await this.stop()

    this.bluetooth.off('deviceConnected', this.onBluetoothDeviceConnected)
    this.bluetooth.off('message', this.onBluetoothMessage)
    this.settings.off('settingsChange', this.onSettingsChange)
    this.gps.off('coordinatesUpdate', this.onCoordinatesUpdate)
    this.weather.off('update', this.onWeatherUpdate)
    // this.progress.off('update', this.onProgressUpdate)

    this.settings.destroy()
    await this.bluetooth.destroy()
    await this.gps.destroy()
    this.tour.destroy()
    this.weather.destroy()
    this.progress.destroy()

    super.removeAllListeners()

    Core.coreInstance = null
  }

  get running() {
    return !!this.map
  }

  async start() {
    if (this.map) {
      await this.stop()
    }

    // eslint-disable-next-line no-console
    console.log('Starting core')

    await this.gps.startObservingLocation(this.settings.getSettings())
    this.map = new MapGeneratorV2(this.settings.getSettings().mapZoom)
    this.updateInfo = { updating: false, pendingUpdate: null }
    // eslint-disable-next-line no-console
    console.log('\tcore started')
  }

  async stop() {
    // eslint-disable-next-line no-console
    console.log('Stopping core')
    this.map = null
    await this.gps.stopObservingLocation()
    // eslint-disable-next-line no-console
    console.log('\tcore stopped')
  }

  private sendCircumferenceUpdate() {
    const cyclocomputer = this.getCyclocomputer()
    if (!cyclocomputer) {
      return
    }

    this.bluetooth
      .sendData(
        cyclocomputer.id,
        MessageType.SET_CIRCUMFERENCE,
        new Uint8Array(
          Float32Array.from([this.settings.getSettings().circumference]).buffer,
        ).buffer,
      )
      .then((success) => {
        if (!success) {
          // eslint-disable-next-line no-console
          console.error('Cannot send circumference update')
        }
      })
  }

  private async sendProgressData() {
    const cyclocomputer = this.getCyclocomputer()
    if (!cyclocomputer) {
      return
    }

    const progressData = this.progress.dataBase

    const success = await this.bluetooth.sendData(
      cyclocomputer.id,
      MessageType.SET_PROGRESS_DATA,
      new Uint8Array(
        Float32Array.from([
          progressData.rideDuration,
          progressData.timeInMotion,
          progressData.traveledDistance,
          progressData.altitudeChange.up,
          progressData.altitudeChange.down,
        ]).buffer,
      ).buffer,
    )

    if (!success) {
      // eslint-disable-next-line no-console
      console.error('Cannot send progress data')
    }

    this.lastProgressDataSendTimestamp = Date.now()
  }

  private handleBluetoothDeviceConnected() {
    this.sendCircumferenceUpdate()
    const coords = this.gps.getCoordinates()
    this.sendGpsStatisticsUpdate(coords.altitude, coords.heading, coords.slope)
    this.handleWeatherUpdate(this.weather.getWeather())
  }

  private handleWeatherUpdate(weather: WeatherSchema | null) {
    if (!weather?.wind) {
      return
    }

    const cyclocomputer = this.getCyclocomputer()
    if (!cyclocomputer) {
      return
    }

    const windDataArray = new Uint8Array(
      Float32Array.from([weather.wind.deg, weather.wind.speed]).buffer,
    )
    const cityNameArray = Uint8Array.from(
      removeDiacritics(weather.name ?? '-')
        .split('')
        .map((ch) => ch.charCodeAt(0)),
    )

    this.bluetooth
      .sendData(
        cyclocomputer.id,
        MessageType.SET_WEATHER_DATA,
        Uint8Array.from([...windDataArray, ...cityNameArray]).buffer,
      )
      .then((success) => {
        if (!success) {
          // eslint-disable-next-line no-console
          console.error('Cannot send weather data')
        }
      })
      .catch(() => undefined)
  }

  private sendGpsStatisticsUpdate(
    altitude: number,
    heading: number,
    slope: number,
  ) {
    if (
      this.gpsStatisticsStore.altitude === altitude &&
      this.gpsStatisticsStore.heading === heading &&
      this.gpsStatisticsStore.slope === slope
    ) {
      return
    }

    const cyclocomputer = this.getCyclocomputer()
    if (!cyclocomputer) {
      return
    }

    this.gpsStatisticsStore = {
      altitude,
      heading,
      slope,
    }

    this.bluetooth
      .sendData(
        cyclocomputer.id,
        MessageType.SET_GPS_STATISTICS,
        new Uint8Array(Float32Array.from([altitude, slope, heading]).buffer)
          .buffer,
      )
      .then((success) => {
        if (!success) {
          // eslint-disable-next-line no-console
          console.error('Cannot send gps statistics update')
        }
      })
      .catch(() => undefined)
  }

  private handleBluetoothMessage(
    message: IncomingMessageType,
    _data: Uint8Array,
  ) {
    if (message === IncomingMessageType.REQUEST_SETTINGS) {
      this.sendCircumferenceUpdate()
    } else if (message === IncomingMessageType.REQUEST_PROGRESS_DATA) {
      this.sendProgressData()
    }
  }

  private async handleSettingsChange(settings: SettingsSchema) {
    this.tour.setSettings(settings.gpxFile, settings.mapZoom)

    if (this.circumference !== settings.circumference) {
      this.circumference = settings.circumference
      this.sendCircumferenceUpdate()
    }

    if (this.map && settings.mapZoom !== this.map.zoom) {
      this.map = new MapGeneratorV2(settings.mapZoom)
    }

    if (
      this.map &&
      this.gps.locationObservingOptions &&
      (this.gps.locationObservingOptions.accuracy !== settings.gpsAccuracy ||
        this.gps.locationObservingOptions.gpsTimeInterval !==
          settings.gpsTimeInterval ||
        this.gps.locationObservingOptions.gpsDistanceSensitivity !==
          settings.gpsDistanceSensitivity)
    ) {
      // eslint-disable-next-line no-console
      console.log('Restarting location observing')
      await this.gps.stopObservingLocation()
      await this.gps.startObservingLocation(settings)
      // eslint-disable-next-line no-console
      console.log('\tlocation observing restarted')
    }
  }

  private async handleCoordinatesUpdate(coords: Coordinates) {
    if (!this.map || (!coords.latitude && !coords.longitude)) {
      return
    }

    this.weather.updateWeather(coords).catch(() => undefined)
    this.progress.updateProgress(coords).catch(() => undefined)
    if (Date.now() - this.lastProgressDataSendTimestamp > 1000 * 60 * 2) {
      this.sendProgressData()
    }
    this.sendGpsStatisticsUpdate(coords.altitude, coords.heading, coords.slope)

    if (this.updateInfo.updating) {
      this.updateInfo.pendingUpdate = coords
      return
    }
    this.updateInfo.updating = true
    await this.updateMap(coords)

    while (this.updateInfo.pendingUpdate) {
      const pendingCoords = this.updateInfo.pendingUpdate
      this.updateInfo.pendingUpdate = null
      await this.updateMap(pendingCoords)
    }
    this.updateInfo.updating = false
  }

  private async updateMap(coords: Coordinates) {
    if (!this.map) {
      return
    }

    try {
      this.map.update(
        coords.latitude,
        coords.longitude,
        -((coords.heading ?? 0) * Math.PI) / 180,
        this.tour.getTour(),
      )
      await this.sendMapPreview(this.map.getData())
      this.emit('mapUpdate', this.map.getData())
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(
        `Failed to update map: ${e instanceof Error ? e.message : String(e)}`,
      )
    }
  }

  private getCyclocomputer() {
    const connectedDevices = this.bluetooth.getConnectedDevices()
    if (connectedDevices.length < 1) {
      return
    }
    return connectedDevices[0]
  }

  private async sendMapPreview(imageData: Uint8ClampedArray | Uint8Array) {
    try {
      const parsedData = parseImageDataV2(imageData)
      if (Date.now() - this.lastMapPreviewSend < MAP_PREVIEW_SEND_FREQUENCY) {
        return
      }
      this.lastMapPreviewSend = Date.now()

      const cyclocomputer = this.getCyclocomputer()
      if (!cyclocomputer) {
        return
      }
      const success = await this.bluetooth.sendData(
        cyclocomputer.id,
        MessageType.SET_MAP_PREVIEW,
        parsedData.buffer,
      )
      if (!success) {
        // eslint-disable-next-line no-console
        console.error('Cannot send map data')
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(
        `Failed to send map preview: ${
          e instanceof Error ? e.message : String(e)
        }`,
      )
    }
  }
}
