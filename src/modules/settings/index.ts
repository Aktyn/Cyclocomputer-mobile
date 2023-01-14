import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Tour } from './../tour/helpers'
import { logError, tryParseJSON } from '../../utils'
import { Module } from '../Module'

const defaultSettings = {
  tours: [] as Tour[],
  // circumference: 223,
  // gpxFile: null as null | (DocumentResult & { type: 'success' }),
  // mapZoom: 15,
  // grayscaleTolerance: 192,
  // gpsAccuracy: LocationAccuracy.BestForNavigation,
  /** Minimum time to wait between each update in milliseconds. Default value may depend on accuracy option. */
  // gpsTimeInterval: 4000,
  /** Receive updates only when the location has changed by at least this distance in meters. Default value may depend on accuracy option. */
  // gpsDistanceSensitivity: 10,
}

export type SettingsSchema = typeof defaultSettings

class SettingsModule extends Module<
  [(name: 'settingsChange', settings: SettingsSchema) => void]
> {
  private _settings = { ...defaultSettings }

  constructor() {
    super()
    this.load()
  }

  get settings() {
    return this._settings
  }

  private load() {
    AsyncStorage.getItem('@settings')
      .then((settingsString) => {
        this._settings = {
          ...this._settings,
          ...tryParseJSON(settingsString ?? '{}', {}),
        }
        this.emitter.emit('settingsChange', this._settings)
      })
      .catch((error) => logError(error, 'Cannot read settings: '))
  }

  setSetting(key: keyof SettingsSchema, value: SettingsSchema[typeof key]) {
    this._settings = {
      ...this._settings,
      [key]: value,
    }
    this.emitter.emit('settingsChange', this._settings)
    AsyncStorage.setItem('@settings', JSON.stringify(this._settings)).catch(
      (error) => logError(error, `Cannot update "${key}" setting: `),
    )
  }
}

export const settingsModule = new SettingsModule()
