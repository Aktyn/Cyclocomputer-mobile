import AsyncStorage from '@react-native-async-storage/async-storage'
import { LocationAccuracy } from 'expo-location'
import type { Tour } from './../tour/helpers'
import { logError, tryParseJSON } from '../../utils'
import { Module } from '../Module'

const defaultSettings = {
  tours: [] as Tour[],
  mapZoom: 15,
  grayscaleTolerance: 192,
  gpsAccuracy: LocationAccuracy.BestForNavigation,
  /** Minimum time to wait between each update in milliseconds. Default value may depend on accuracy option. */
  gpsTimeInterval: 200,
  /** Receive updates only when the location has changed by at least this distance in meters. Default value may depend on accuracy option. */
  gpsDistanceSensitivity: 1,
}

export type SettingsSchema = typeof defaultSettings

class SettingsModule extends Module<
  [
    (name: 'settingsChange', settings: SettingsSchema) => void,
    <K extends keyof SettingsSchema>(
      name: 'singleSettingChange',
      key: K,
      value: SettingsSchema[K],
    ) => void,
  ]
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

  setSetting<K extends keyof SettingsSchema>(key: K, value: SettingsSchema[K]) {
    this._settings = {
      ...this._settings,
      [key]: value,
    }
    this.emitter.emit('settingsChange', this._settings)
    this.emitter.emit('singleSettingChange', key, value)
    AsyncStorage.setItem('@settings', JSON.stringify(this._settings)).catch(
      (error) => logError(error, `Cannot update "${key}" setting: `),
    )
  }
}

export const settingsModule = new SettingsModule()