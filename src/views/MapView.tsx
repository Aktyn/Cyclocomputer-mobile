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
import { cyan } from 'material-ui-colors'
import { StyleSheet, View } from 'react-native'
import { FAB, Portal, Text } from 'react-native-paper'
import { ErrorAlert } from '../components/ErrorAlert'
import useCancellablePromise from '../hooks/useCancellablePromise'
import { useModuleEvent } from '../hooks/useModuleEvent'
import { locationModule } from '../modules/location'
import { progressModule } from '../modules/progress'
import { tourModule } from '../modules/tour'
import {
  errorMessage,
  metersPerSecondToKilometersPerHour,
  parseTime,
} from '../utils'

const defaultZoom = 16
const defaultCoords = {
  lat: 51.776932,
  lng: 19.427908,
}

interface MapViewProps {
  onOpenSettings: () => void
}

export const MapView = ({ onOpenSettings }: MapViewProps) => {
  const cancellable = useCancellablePromise()

  const [openMenu, setOpenMenu] = useState(false)
  const [currentLocation, setCurrentLocation] =
    useState<LocationObjectCoords | null>(locationModule.coords)
  const [zoom, setZoom] = useState(defaultZoom)
  const [error, setError] = useState<string | null>(null)
  const [tour, setTour] = useState(tourModule.selectedTour)
  const [progress, setProgress] = useState(progressModule.progress)

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
        setError(errorMessage.get(errorCode) ?? null)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useModuleEvent(locationModule, 'locationUpdate', (location) =>
    setCurrentLocation(location.coords),
  )
  useModuleEvent(tourModule, 'tourSelected', setTour)
  useModuleEvent(progressModule, 'progressUpdate', (newProgress) =>
    setProgress({ ...newProgress }),
  )

  const routeShape = useMemo<MapShape | null>(() => {
    if (!tour) {
      return null
    }
    return {
      id: `route-${tour.id}`,
      color: cyan[400],
      smoothFactor: 0,
      opacity: 0.5,
      weight: 6,
      positions: tour.raw.map((point) => {
        return {
          index: point.index,
          lat: point.latitude,
          lng: point.longitude,
        }
      }),
      shapeType: 'polyline',
      lineCap: 'round',
      lineJoin: 'round',
    }
  }, [tour])

  const accuracyRadiusShape = useMemo<MapShape>(
    () => ({
      id: 'location-accuracy-radius',
      shapeType: 'circle',
      center: coords,
      radius: currentLocation?.accuracy ?? 0,
      color: cyan[400],
      stroke: true,
      weight: 1,
      opacity: 1,
      fillOpacity: 0.5,
      fill: true,
    }),
    [coords, currentLocation?.accuracy],
  )

  const mapShapes = useMemo<MapShape[]>(
    () => [accuracyRadiusShape, routeShape].filter(Boolean) as MapShape[],
    [accuracyRadiusShape, routeShape],
  )

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

  const handleLeafletViewUpdate = useCallback((event: LeafletWebViewEvent) => {
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
          <StatsRow>
            <StatsLabel>Speed:</StatsLabel>
            <StatsValue>
              {metersPerSecondToKilometersPerHour(
                currentLocation.speed ?? 0,
              ).toFixed(2)}
              &nbsp;km/h
            </StatsValue>
          </StatsRow>
          <StatsRow>
            <StatsLabel>Altitude:</StatsLabel>
            <StatsValue>
              {currentLocation.altitude?.toFixed(2)}&nbsp;+-
              {currentLocation.altitudeAccuracy?.toFixed(2)}m
            </StatsValue>
          </StatsRow>
          <StatsRow>
            <StatsLabel>Coords accuracy:</StatsLabel>
            <StatsValue>+-{currentLocation.accuracy?.toFixed(2)}m</StatsValue>
          </StatsRow>
          <StatsRow>
            <StatsLabel>Distance traveled:</StatsLabel>
            <StatsValue>{progress.traveledDistanceKm.toFixed(2)}km</StatsValue>
          </StatsRow>
          <StatsRow>
            <StatsLabel>Heading:</StatsLabel>
            <StatsValue>{currentLocation.heading?.toFixed(2)}deg</StatsValue>
          </StatsRow>
          <StatsRow>
            <StatsLabel>Slope:</StatsLabel>
            <StatsValue>{progress.currentSlope.toFixed(2)}deg</StatsValue>
          </StatsRow>
          <StatsRow>
            <StatsLabel>Ride duration:</StatsLabel>
            <StatsValue>{parseTime(progress.rideDuration)}</StatsValue>
          </StatsRow>
          <StatsRow>
            <StatsLabel>Time in motion:</StatsLabel>
            <StatsValue>{parseTime(progress.timeInMotion)}</StatsValue>
          </StatsRow>
        </View>
      )}
      <Portal>
        <FAB.Group
          open={openMenu}
          visible
          variant="primary"
          icon={openMenu ? 'close' : 'menu'}
          actions={[
            {
              icon: 'cog',
              size: 'medium',
              onPress: onOpenSettings,
            },
            {
              icon: 'restart',
              size: 'medium',
              onPress: () => progressModule.resetProgress(),
            },
          ]}
          onStateChange={({ open }) => setOpenMenu(open)}
        />
      </Portal>
      {error && <ErrorAlert message={error} />}
    </View>
  )
}

const StatsRow = memo(({ children }: PropsWithChildren<object>) => (
  <View
    style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
    }}
  >
    {children}
  </View>
))
const StatsLabel = memo(({ children }: PropsWithChildren<object>) => (
  <Text
    variant="bodyMedium"
    numberOfLines={1}
    style={{
      width: '50%',
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
      width: '50%',
      flexWrap: 'nowrap',
      fontWeight: 'bold',
      marginLeft: 4,
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
    bottom: 0,
    padding: 8,
    zIndex: 1,
    backgroundColor: '#000a',
    display: 'flex',
    flexDirection: 'column',
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
    baseLayerIsChecked: false,
    baseLayer: true,
    baseLayerName: 'MapBox',
    layerType: 'TileLayer' as MapLayerType,
    url: `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=pk.eyJ1Ijoid2hlcmVzbXl3YXZlcyIsImEiOiJjanJ6cGZtd24xYmU0M3lxcmVhMDR2dWlqIn0.QQSWbd-riqn1U5ppmyQjRw`,
  },
  {
    baseLayerName: 'Dark',
    baseLayerIsChecked: false,
    layerType: 'TileLayer' as MapLayerType,
    baseLayer: true,
    url: `https://{s}.tile.jawg.io/jawg-matrix/{z}/{x}/{y}{r}.png?access-token=${JAWG_API_KEY}`,
    attribution:
      '<a href="http://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
]
