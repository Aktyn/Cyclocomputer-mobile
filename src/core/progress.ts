import { EventEmitter } from 'events'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  debounce,
  distanceBetweenEarthCoordinatesInKm,
  last,
  tryParseJSON,
} from '../utils'
import type { Coordinates } from './gps'

export interface ProgressDataBase {
  traveledDistance: number
  /** Meters */
  altitudeChange: { up: number; down: number }
  rideDuration: number
  timeInMotion: number
  currentAltitude: number
  currentSlope: number
}

interface ProgressData extends ProgressDataBase {
  gpsHistory: Coordinates[]
}

function getEmptyProgressData(): ProgressData {
  return {
    gpsHistory: [],
    traveledDistance: 0,
    altitudeChange: { up: 0, down: 0 },
    rideDuration: 0,
    timeInMotion: 0,
    currentAltitude: 0,
    currentSlope: 0,
  }
}

declare interface ProgressEventEmitter {
  on(event: 'update', listener: (data: ProgressDataBase) => void): this
  off(event: 'update', listener: (data: ProgressDataBase) => void): this
  emit(event: 'update', data: ProgressDataBase): boolean
}

class ProgressEventEmitter extends EventEmitter {}

export class Progress extends ProgressEventEmitter {
  private data = getEmptyProgressData()
  private loaded = false
  lastAltitudeFetchDuration = 0

  private synchronizeData = debounce(
    (data: ProgressData) => {
      AsyncStorage.setItem('@progress', JSON.stringify(data)).catch((error) => {
        // eslint-disable-next-line no-console
        console.error(
          `Cannot update @progress data: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      })
    },
    5000,
    {
      forceAfterNumberOfAttempts: 8,
    },
  )

  constructor() {
    super()

    AsyncStorage.getItem('@progress')
      .then((progressString) => {
        if (!progressString) {
          return
        }
        const emptyProgress = getEmptyProgressData()
        const loadedData = tryParseJSON(progressString, emptyProgress)

        //if last saved coordinates are older than 8 hours, discard entire saved progress data
        if (
          loadedData.gpsHistory.length &&
          (last(loadedData.gpsHistory)?.timestamp ?? 0) <
            Date.now() - 1000 * 60 * 60 * 8
        ) {
          return
        }

        this.data = { ...emptyProgress, ...loadedData }
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error(
          `Cannot load progress data: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      })
      .finally(() => {
        this.loaded = true
      })
  }

  destroy() {
    super.removeAllListeners()
    this.synchronizeData.cancel()
  }

  get dataBase(): ProgressDataBase {
    return {
      traveledDistance: this.data.traveledDistance,
      altitudeChange: this.data.altitudeChange,
      rideDuration: this.data.rideDuration,
      timeInMotion: this.data.timeInMotion,
      currentAltitude: this.data.currentAltitude,
      currentSlope: this.data.currentSlope,
    }
  }

  reset() {
    this.synchronizeData.run((this.data = getEmptyProgressData()))
    this.emit('update', this.dataBase)
  }

  private async fetchAltitude(
    latitude: number,
    longitude: number,
  ): Promise<number> {
    try {
      const data = await fetch(
        `https://api.opentopodata.org/v1/eudem25m?locations=${latitude},${longitude}`,
        { method: 'GET' },
      ).then((res) => res.json())

      if (data?.status !== 'OK') {
        return 0
      }

      return data.results?.[0]?.elevation ?? 0
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        `Cannot fetch elevation data: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
      return 0
    }
  }

  /** Should be called only from Core */
  async updateProgress(coords: Coordinates) {
    if (!this.loaded) {
      return
    }

    //In case fetched altitude is not available (which means it will return 0), use saved altitude assuming the real altitude didn't change
    const start = Date.now()
    const altitude =
      (await this.fetchAltitude(coords.latitude, coords.longitude)) ||
      this.data.currentAltitude
    this.lastAltitudeFetchDuration = Date.now() - start

    const lastCoords = last(this.data.gpsHistory)
    if (lastCoords && this.data.currentAltitude !== 0) {
      const coordinatesDistance = distanceBetweenEarthCoordinatesInKm(
        lastCoords.latitude,
        lastCoords.longitude,
        coords.latitude,
        coords.longitude,
      )
      /** Current altitude - previous altitude */
      const altitudeDifferenceMeters = altitude - this.data.currentAltitude

      this.data.currentSlope =
        (Math.atan2(altitudeDifferenceMeters, coordinatesDistance * 1000) *
          180) /
        Math.PI

      if (altitudeDifferenceMeters > 0) {
        this.data.altitudeChange.up += altitudeDifferenceMeters
      } else if (altitudeDifferenceMeters < 0) {
        this.data.altitudeChange.down -= altitudeDifferenceMeters
      }
      this.data.traveledDistance += Math.sqrt(
        coordinatesDistance ** 2 + (altitudeDifferenceMeters / 1000) ** 2,
      )

      // If the GPS speed is at least 5 km/h, we consider the user is in motion
      if ((coords.speed * 3600) / 1000 > 5) {
        this.data.timeInMotion += coords.timestamp - lastCoords.timestamp
      }
      this.data.rideDuration =
        coords.timestamp - this.data.gpsHistory[0].timestamp
    }
    this.data.gpsHistory.push(coords)
    this.data.currentAltitude = altitude
    this.emit('update', this.dataBase)

    this.synchronizeData.run(this.data)
  }
}
