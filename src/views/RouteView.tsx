import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import {
  ExpoLeaflet,
  type LeafletWebViewEvent,
  type MapLayerType,
} from 'expo-leaflet'
import type { Dimensions, MapShape } from 'expo-leaflet/web/src/model'
import type { LocationObjectCoords } from 'expo-location'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'
import { ErrorAlert } from '../components/ErrorAlert'
import useCancellablePromise from '../hooks/useCancellablePromise'
import { useModuleEvent } from '../hooks/useModuleEvent'
import { locationModule } from '../modules/location'
import { errorMessage, metersPerSecondToKilometersPerHour } from '../utils'

const defaultZoom = 16
const defaultCoords = {
  lat: 51.776932,
  lng: 19.427908,
}

export const RouteView = () => {
  const cancellable = useCancellablePromise()

  const [currentLocation, setCurrentLocation] =
    useState<LocationObjectCoords | null>(locationModule.coords)
  const [zoom, setZoom] = useState(defaultZoom)
  const [error, setError] = useState<string | null>(null)

  const coords = useMemo(
    () =>
      currentLocation
        ? {
            lat: currentLocation.latitude,
            lng: currentLocation.longitude,
          }
        : defaultCoords,
    [currentLocation],
  )

  useEffect(() => {
    cancellable(locationModule.startMonitoring()).then((errorCode) => {
      if (errorCode) {
        setError(errorMessage.get(errorCode))
      }
    })
  }, [cancellable])

  useModuleEvent(locationModule, 'locationUpdate', (location) => {
    setCurrentLocation(location.coords)
  })

  const markers = useMemo(
    () => [
      {
        id: 'default-marker',
        position: coords,
        icon: '🔵',
        size: [16, 16] as Dimensions,
        iconAnchor: [6, 12] as [number, number],
      },
    ],
    [coords],
  )

  const mapShapes = useMemo(() => {
    const shapes: MapShape[] = [
      {
        id: 'location-accuracy-radius',
        shapeType: 'circle',
        center: coords,
        radius: currentLocation?.accuracy ?? 0,
        color: '#29B6F6',
        stroke: true,
        weight: 1,
        opacity: 1,
        fillOpacity: 0.4,
        fill: true,
      },
    ]
    return shapes
  }, [coords, currentLocation?.accuracy])

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
          mapShapes={mapShapes}
        />
      </View>
      {currentLocation && (
        <View style={styles.stats}>
          <StatsLabel>Speed:</StatsLabel>
          <StatsValue>
            {metersPerSecondToKilometersPerHour(
              currentLocation.speed ?? 0,
            ).toFixed(2)}
            &nbsp;km/h
          </StatsValue>
          <StatsLabel>Altitude:</StatsLabel>
          <StatsValue>
            {currentLocation.altitude?.toFixed(2)}&nbsp;+-
            {currentLocation.altitudeAccuracy?.toFixed(2)}m
          </StatsValue>
          <StatsLabel>Coords accuracy:</StatsLabel>
          <StatsValue>+-{currentLocation.accuracy?.toFixed(2)}m</StatsValue>
          <StatsLabel>Heading:</StatsLabel>
          <StatsValue>{currentLocation.heading?.toFixed(2)}deg</StatsValue>
        </View>
      )}
      {error && <ErrorAlert message={error} />}
    </View>
  )
}

const StatsLabel = memo(({ children }: PropsWithChildren<object>) => (
  <Text
    variant="bodyMedium"
    numberOfLines={1}
    style={{
      flexGrow: 1,
      flexShrink: 0,
      textAlign: 'right',
    }}
  >
    {children}
  </Text>
))
const StatsValue = memo(({ children }: PropsWithChildren<object>) => (
  <Text
    variant="bodyMedium"
    numberOfLines={1}
    style={{
      flexWrap: 'nowrap',
      fontWeight: 'bold',
      marginLeft: 4,
      flexGrow: 1,
      flexShrink: 0,
      textAlign: 'left',
    }}
  >
    {children}
  </Text>
))

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
  stats: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    zIndex: 1,
    backgroundColor: '#000a',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
})

// const JAWG_API_KEY =
// 'p6tUpXcWOZmJBNkMCl8YuHojFVVOKjqJasjD03TNeaLdFs0dvFdiITa2v5RabrJ2'

const mapLayers = [
  {
    attribution:
      '&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
    baseLayerIsChecked: true,
    baseLayerName: 'OpenStreetMap',
    layerType: 'TileLayer' as MapLayerType,
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
  //TODO: test other layers on production
  // {
  //   baseLayerIsChecked: true,
  //   baseLayer: true,
  //   baseLayerName: 'MapBox',
  //   layerType: 'TileLayer' as MapLayerType,
  //   url: `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=pk.eyJ1Ijoid2hlcmVzbXl3YXZlcyIsImEiOiJjanJ6cGZtd24xYmU0M3lxcmVhMDR2dWlqIn0.QQSWbd-riqn1U5ppmyQjRw`,
  // },
  // {
  //   baseLayerName: 'Dark',
  //   baseLayerIsChecked: true,
  //   layerType: 'TileLayer' as MapLayerType,
  //   baseLayer: true,
  //   url: `https://{s}.tile.jawg.io/jawg-matrix/{z}/{x}/{y}{r}.png?access-token=${JAWG_API_KEY}`,
  //   attribution:
  //     '<a href="http://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  // },
]
