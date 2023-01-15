import AsyncStorage from '@react-native-async-storage/async-storage'
import type { LocationObject } from 'expo-location'
import { tourModule } from './../tour/index'
import {
  debounce,
  distanceBetweenEarthCoordinatesInKm,
  logError,
  metersPerSecondToKilometersPerHour,
  tryParseJSON,
} from '../../utils'
import { Module } from '../Module'
import { locationModule } from '../location'
import type { Tour } from '../tour/helpers'

interface ProgressSchema {
  tourId: string | null
  location: LocationObject | null
  traveledDistanceKm: number
  rideDuration: number
  timeInMotion: number
  currentAltitudeMeters: number
  altitudeChangeMeters: { up: number; down: number }
  /** Current slope in degrees */
  currentSlope: number
}

function getEmptyProgressData(): ProgressSchema {
  return {
    tourId: null,
    location: null,
    traveledDistanceKm: 0,
    rideDuration: 0,
    timeInMotion: 0,
    currentAltitudeMeters: 0,
    altitudeChangeMeters: { up: 0, down: 0 },
    currentSlope: 0,
  }
}

class ProgressModule extends Module<
  [(name: 'progressUpdate', progress: ProgressSchema) => void]
> {
  private _progress: ProgressSchema = getEmptyProgressData()
  private loaded = false

  get progress() {
    return this._progress
  }

  constructor() {
    super()
    locationModule.emitter.on('locationUpdate', this.onLocationUpdate)
    tourModule.emitter.on('tourSelected', this.onTourChange)

    this.load(tourModule.selectedTour?.id ?? null)
  }

  destroy() {
    locationModule.emitter.off('locationUpdate', this.onLocationUpdate)
    tourModule.emitter.off('tourSelected', this.onTourChange)
  }

  private load(tourId: string | null) {
    this.loaded = false
    AsyncStorage.getItem(`@progress-${tourId}`)
      .then((progressString) => {
        if (!progressString) {
          return
        }
        const emptyProgress = {
          ...getEmptyProgressData(),
          tourId,
        }
        const loadedData = tryParseJSON(progressString, emptyProgress)

        this._progress = { ...emptyProgress, ...loadedData, location: null }
        this.emitter.emit('progressUpdate', this._progress)
      })
      .catch((error) => logError(error, 'Cannot load progress data: '))
      .finally(() => {
        this.loaded = true
      })
  }

  private readonly onTourChange = (tour: Tour | null) => {
    const id = tour?.id ?? null
    if (id === this._progress.tourId) {
      return
    }
    this._progress = {
      ...getEmptyProgressData(),
      tourId: id,
    }
    this.emitter.emit('progressUpdate', this._progress)
    this.load(id)
  }

  private readonly onLocationUpdate = async (location: LocationObject) => {
    if (!this.loaded) {
      return
    }

    if (this.progress.tourId !== (tourModule.selectedTour?.id ?? null)) {
      console.warn('Tour changed while recording progress')
    }

    const { coords } = location

    if (this._progress.location && this._progress.currentAltitudeMeters !== 0) {
      const coordinatesDistanceKm = distanceBetweenEarthCoordinatesInKm(
        this._progress.location.coords.latitude,
        this._progress.location.coords.longitude,
        coords.latitude,
        coords.longitude,
      )
      const altitudeDifferenceMeters =
        (coords.altitude ?? 0) - this._progress.currentAltitudeMeters

      this._progress.currentSlope =
        (Math.atan2(altitudeDifferenceMeters, coordinatesDistanceKm * 1000) *
          180) /
        Math.PI

      if (altitudeDifferenceMeters > 0) {
        this._progress.altitudeChangeMeters.up += altitudeDifferenceMeters
      } else if (altitudeDifferenceMeters < 0) {
        this._progress.altitudeChangeMeters.down -= altitudeDifferenceMeters
      }
      this._progress.traveledDistanceKm += Math.sqrt(
        coordinatesDistanceKm ** 2 + (altitudeDifferenceMeters / 1000) ** 2,
      )

      const timeBetweenUpdates =
        location.timestamp - this._progress.location.timestamp

      // If the GPS speed is at least 5 km/h the user is considered to be in motion
      if (metersPerSecondToKilometersPerHour(coords.speed ?? 0) > 5) {
        this._progress.timeInMotion += timeBetweenUpdates
      }
      this._progress.rideDuration += timeBetweenUpdates //TODO: fix this because there is a time gap when the app doesn't work for some period of time
    }
    this._progress.location = location
    this._progress.currentAltitudeMeters = coords.altitude ?? 0
    this.emitter.emit('progressUpdate', this._progress)

    this.synchronizeData.run(
      this._progress,
      tourModule.selectedTour?.id ?? null,
    )
  }

  private readonly synchronizeData = debounce(
    (data: ProgressSchema, tourId: string | null) => {
      AsyncStorage.setItem(`@progress-${tourId}`, JSON.stringify(data)).catch(
        (error) => logError(error, 'Cannot update @progress data: '),
      )
    },
    5000,
    { forceAfterNumberOfAttempts: 8 },
  )
}

export const progressModule = new ProgressModule()
