import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ExpoLeaflet,
  type LeafletWebViewEvent,
  type MapLayerType,
} from 'expo-leaflet'
import type { Dimensions } from 'expo-leaflet/web/src/model'
import { StyleSheet, View } from 'react-native'
import { ErrorAlert } from '../components/ErrorAlert'
import useCancellablePromise from '../hooks/useCancellablePromise'
import { useModuleEvent } from '../hooks/useModuleEvent'
import { locationModule } from '../modules/location'
import { errorMessage } from '../utils'

const defaultZoom = 16

export const RouteView = () => {
  const cancellable = useCancellablePromise()

  const [coords, setCoords] = useState({
    lat: 51.776932,
    lng: 19.427908,
  })
  const [zoom, setZoom] = useState(defaultZoom)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    cancellable(locationModule.startMonitoring()).then((errorCode) => {
      if (errorCode) {
        setError(errorMessage.get(errorCode))
      }
    })
  }, [cancellable])

  useModuleEvent(locationModule, 'locationUpdate', (location) => {
    // eslint-disable-next-line no-console
    console.log(
      'locationUpdate:',
      location.coords.latitude,
      location.coords.longitude,
      location.coords.speed * 3.6,
    )
    setCoords({
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    })
  })

  const markers = useMemo(
    () => [
      {
        id: 'default-marker',
        position: coords,
        icon: '🔵',
        size: [16, 16] as Dimensions,
        iconAnchor: [8, 8],
      },
    ],
    [coords],
  )

  const handleLeafletViewUpdate = useCallback((event: LeafletWebViewEvent) => {
    // console.log(event.tag, event)
    switch (event.tag) {
      case 'onMoveEnd':
        setZoom(event.zoom)
        break
    }
  }, [])

  return (
    <View style={styles.container}>
      <View style={styles.map}>
        <ExpoLeaflet
          key="leaflet-view"
          mapMarkers={markers}
          mapCenterPosition={coords}
          mapLayers={mapLayers}
          onMessage={handleLeafletViewUpdate}
          zoom={zoom}
          maxZoom={18}
          // mapShapes={tourShapes}
        />
      </View>
      {error && <ErrorAlert message={error} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexGrow: 1,
    flex: 1,
  },
  map: {
    flexGrow: 1,
    width: '100%',
  },
})

const JAWG_API_KEY =
  'p6tUpXcWOZmJBNkMCl8YuHojFVVOKjqJasjD03TNeaLdFs0dvFdiITa2v5RabrJ2'

const mapLayers = [
  {
    attribution:
      '&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
    baseLayerIsChecked: true,
    baseLayerName: 'OpenStreetMap',
    layerType: 'TileLayer' as MapLayerType,
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
  {
    baseLayerIsChecked: true,
    baseLayer: true,
    baseLayerName: 'MapBox',
    layerType: 'TileLayer' as MapLayerType,
    url: `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=pk.eyJ1Ijoid2hlcmVzbXl3YXZlcyIsImEiOiJjanJ6cGZtd24xYmU0M3lxcmVhMDR2dWlqIn0.QQSWbd-riqn1U5ppmyQjRw`,
  },
  {
    baseLayerName: 'Dark',
    baseLayerIsChecked: true,
    layerType: 'TileLayer' as MapLayerType,
    baseLayer: true,
    url: `https://{s}.tile.jawg.io/jawg-matrix/{z}/{x}/{y}{r}.png?access-token=${JAWG_API_KEY}`,
    attribution:
      '<a href="http://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
]
