import * as Device from 'expo-device'
import { getDocumentAsync } from 'expo-document-picker'
import { type Tour, tourFromGpxContent, clusterTour } from './helpers'
import { logError } from '../../utils'
import { gpsFileContentMock } from '../../utils/mockData'
import { Module } from '../Module'
import type { SettingsSchema } from '../settings'
import { settingsModule } from '../settings'

class TourModule extends Module<
  [
    (name: 'toursListChanged', tours: Tour[]) => void,
    (name: 'tourSelected', tour: Tour | null) => void,
  ]
> {
  private _tours = settingsModule.settings.tours
  private _selectedTour: Tour | null = null

  private readonly onSettingsChange = (settings: SettingsSchema) => {
    this._tours = settings.tours
    this.makeSureSelectedTourIsProperlyClustered(settings.mapZoom)
  }

  get tours() {
    return this._tours
  }
  get selectedTour() {
    return this._selectedTour
  }

  constructor() {
    super()
    settingsModule.emitter.on('settingsChange', this.onSettingsChange)
  }

  destroy() {
    settingsModule.emitter.off('settingsChange', this.onSettingsChange)
  }

  private makeSureSelectedTourIsProperlyClustered(mapZoom: number) {
    if (this._selectedTour && this._selectedTour.clusterSize !== mapZoom) {
      clusterTour(this._selectedTour, mapZoom)
    }
  }

  private onToursListChanged() {
    this.emitter.emit('toursListChanged', this._tours)
    settingsModule.setSetting('tours', this._tours)
  }

  private addTour(tour: Tour) {
    if (this._tours.some(({ id }) => id === tour.id)) {
      return
    }
    this._tours.unshift(tour)
    this.onToursListChanged()
  }

  public deleteTour(tour: Tour) {
    this._tours = this._tours.filter(({ id }) => id !== tour.id)
    if (this._selectedTour?.id === tour.id) {
      this._selectedTour = null
      this.emitter.emit('tourSelected', null)
    }
    this.onToursListChanged()
  }

  public selectTour(tour: Tour) {
    this._selectedTour = tour
    this.makeSureSelectedTourIsProperlyClustered(
      settingsModule.settings.mapZoom,
    )
    this.emitter.emit('tourSelected', tour)
  }

  public loadFromFile() {
    if (!Device.isDevice) {
      return Promise.resolve()
        .then(() =>
          this.addTour(
            tourFromGpxContent(
              gpsFileContentMock,
              settingsModule.settings.mapZoom,
            ),
          ),
        )
        .catch(logError)
    }
    return getDocumentAsync({
      type: ['application/gpx+xml', 'application/octet-stream'],
    })
      .then((data) => {
        if (data.type === 'cancel') {
          throw data
        }
        if (!data.uri) {
          return
        }
        return fetch(data.uri)
          .then((res) => res.text())
          .then((content) => {
            this.addTour(
              tourFromGpxContent(content, settingsModule.settings.mapZoom),
            )
          })
          .catch(logError)
      })
      .catch((error) => logError(error, 'Cannot load gpx file. '))
  }
}

export const tourModule = new TourModule()
