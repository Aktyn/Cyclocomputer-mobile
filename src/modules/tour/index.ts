import * as Device from 'expo-device'
import { getDocumentAsync } from 'expo-document-picker'
import { type Tour, tourFromGpxContent } from './helpers'
import { logError } from '../../utils'
import { gpsFileContentMock } from '../../utils/mockData'
import { Module } from '../Module'

class TourModule extends Module<
  [
    (name: 'toursListChanged', tours: Tour[]) => void,
    (name: 'tourSelected', tour: Tour | null) => void,
  ]
> {
  private _tours: Tour[] = []
  private _selectedTour: Tour | null = null

  get tours() {
    return this._tours
  }
  get selectedTour() {
    return this._selectedTour
  }

  private onToursListChanged() {
    this.emitter.emit('toursListChanged', this._tours)
    //TODO: store loaded tours in storage
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
    this.emitter.emit('tourSelected', tour)
  }

  public loadFromFile() {
    if (!Device.isDevice) {
      //TODO: use mapZoom from settings and regenerate clustered tour when mapZoom changes
      return Promise.resolve()
        .then(() => this.addTour(tourFromGpxContent(gpsFileContentMock, 15)))
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
            this.addTour(tourFromGpxContent(content, 15))
          })
          .catch(logError)
      })
      .catch((error) => logError(error, 'Cannot load gpx file. '))
  }
}

export const tourModule = new TourModule()
