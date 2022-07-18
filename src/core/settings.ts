import EventEmitter from 'events'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { DocumentResult } from 'expo-document-picker'
import { LocationAccuracy } from 'expo-location'
import { tryParseJSON } from '../utils'

const defaultSettings = {
  circumference: 223,
  gpxFile: null as null | (DocumentResult & { type: 'success' }),
  mapZoom: 16,
  gpsAccuracy: LocationAccuracy.Highest,
  /** Minimum time to wait between each update in milliseconds. Default value may depend on accuracy option. */
  gpsTimeInterval: 4000,
  /** Receive updates only when the location has changed by at least this distance in meters. Default value may depend on accuracy option. */
  gpsDistanceSensitivity: 10,
}

export type SettingsSchema = typeof defaultSettings

declare interface SettingsEventEmitter {
  on(
    event: 'settingsChange',
    listener: (settings: SettingsSchema) => void,
  ): this
  off(
    event: 'settingsChange',
    listener: (settings: SettingsSchema) => void,
  ): this
  emit(event: 'settingsChange', settings: SettingsSchema): boolean
}

class SettingsEventEmitter extends EventEmitter {}

export class Settings extends SettingsEventEmitter {
  private settings = { ...defaultSettings }

  constructor() {
    super()

    this.load()
  }

  destroy() {
    //
  }

  getSettings(): SettingsSchema {
    return this.settings
  }

  private load() {
    AsyncStorage.getItem('@settings')
      .then((settingsString) => {
        this.settings = {
          ...this.settings,
          ...tryParseJSON(settingsString ?? '{}', {}),
        }
        this.emit('settingsChange', this.settings)
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error(
          `Cannot read circumference value: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      })
  }

  setSetting(key: keyof SettingsSchema, value: SettingsSchema[typeof key]) {
    this.settings = {
      ...this.settings,
      [key]: value,
    }
    this.emit('settingsChange', this.settings)
    AsyncStorage.setItem('@settings', JSON.stringify(this.settings)).catch(
      (error) => {
        // eslint-disable-next-line no-console
        console.error(
          `Cannot update "${key}" setting: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      },
    )
  }
}
