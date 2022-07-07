import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Buffer } from '@craftzdog/react-native-buffer'
import { cyan } from 'material-ui-colors'
import type { StyleProp, TextStyle } from 'react-native'
import { StyleSheet, View } from 'react-native'
import Canvas from 'react-native-canvas'
import type {
  LatLng,
  MapShape,
  WebviewLeafletMessage,
} from 'react-native-leaflet-view'
import { MapShapeType, LeafletView } from 'react-native-leaflet-view'
import { FAB, Subheading, Text } from 'react-native-paper'
import { CompassWidget } from '../components/CompassWidget'
import { core } from '../core'
import { IncomingMessageType } from '../core/message'
import { useGPS } from '../hooks/useGPS'
import { useTour } from '../hooks/useTour'
import { useWeather } from '../hooks/useWeather'
import { clamp } from '../utils'
import { SettingsDialog } from './settings/SettingsDialog'

const DEFAULT_ZOOM = 16

export const MainView = () => {
  const canvasRef = useRef<Canvas>(null)

  const gps = useGPS()
  const tour = useTour()
  const weather = useWeather()

  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [speed, setSpeed] = useState(0)
  const [openSettings, setOpenSettings] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) {
      return
    }

    const handleMessage = (message: IncomingMessageType, data: Uint8Array) => {
      if (message === IncomingMessageType.UPDATE_SPEED) {
        setSpeed(Buffer.from(data).readFloatLE(0))
      }
    }

    core.bluetooth.on('message', handleMessage)

    // eslint-disable-next-line no-console
    core.start(canvasRef.current).catch(console.error)

    return () => {
      core.stop()
      core.bluetooth.off('message', handleMessage)
    }
  }, [])

  const latLng = useMemo<LatLng>(
    () => ({
      lat: gps.coordinates.latitude,
      lng: gps.coordinates.longitude,
    }),
    [gps.coordinates.latitude, gps.coordinates.longitude],
  )

  const tourShapes = useMemo<MapShape[]>(() => {
    return [
      {
        color: cyan[400],
        positions: Array.from(tour.values())
          .reduce((points, cluster) => {
            for (const point of cluster) {
              points.push({
                index: point.index,
                lat: point.latitude,
                lng: point.longitude,
              })
            }
            return points
          }, [] as LatLng[])
          .sort((a, b) => a.index - b.index),
        shapeType: MapShapeType.POLYLINE,
      },
    ]
  }, [tour])

  const handleLeafletViewUpdate = useCallback(
    (message: WebviewLeafletMessage) => {
      if (
        message.payload?.zoom &&
        zoom !== message.payload.zoom &&
        message.payload.zoom > 6
      ) {
        setZoom(message.payload.zoom)
      }
    },
    [zoom],
  )

  return (
    <View style={styles.container}>
      <View style={styles.stats}>
        <View style={styles.statsChild}>
          <Subheading style={styles.label}>Speed:&nbsp;</Subheading>
          <Subheading style={styles.value}>
            {Math.round(speed || gps.coordinates.speed)}&nbsp;km/h
          </Subheading>
        </View>
        <View style={styles.statsChild}>
          <Subheading style={styles.label}>Altitude:&nbsp;</Subheading>
          <Subheading style={styles.value}>
            {clamp(gps.coordinates.altitude, -10000, 10000).toFixed(1)}m
          </Subheading>
        </View>
        <View style={styles.statsChild}>
          <Subheading style={styles.label}>Slope:&nbsp;</Subheading>
          <Subheading style={styles.value}>
            {gps.coordinates.slope.toFixed(1)}%
          </Subheading>
        </View>
        <View style={styles.statsChild}>
          <Subheading style={styles.label}>Heading:&nbsp;</Subheading>
          <View style={styles.value}>
            <Subheading
              style={{
                ...styles.value,
                flexGrow: 0,
                flexBasis: 'auto',
                marginRight: 8,
              }}
            >
              {gps.coordinates.heading.toFixed(1)}°
            </Subheading>
            <CompassWidget size={24} direction={gps.coordinates.heading} />
          </View>
        </View>
        {weather && (
          <>
            <View style={styles.statsChild}>
              <Subheading style={styles.label}>City:&nbsp;</Subheading>
              <Subheading style={styles.value} adjustsFontSizeToFit>
                {weather.name}
              </Subheading>
            </View>
            <View style={styles.statsChild}>
              <Subheading style={styles.label}>Wind:&nbsp;</Subheading>
              <View style={styles.value}>
                <Subheading
                  style={{
                    ...styles.value,
                    flexGrow: 0,
                    flexBasis: 'auto',
                    marginRight: 8,
                  }}
                >
                  {weather.wind?.speed?.toFixed(1)}m/s
                </Subheading>
                {weather.wind && (
                  <CompassWidget
                    size={24}
                    direction={weather.wind.deg ?? 0}
                    hideNorth
                  />
                )}
              </View>
            </View>
          </>
        )}
      </View>
      <View style={styles.map}>
        {gps.granted ? (
          <LeafletView
            key="leaflet-view"
            doDebug={false}
            androidHardwareAccelerationDisabled={false}
            mapMarkers={[
              {
                position: latLng,
                icon: '🔵',
                size: [16, 16],
                iconAnchor: [8, 8],
              },
            ]}
            mapShapes={tourShapes}
            mapCenterPosition={latLng}
            zoom={zoom}
            onMessageReceived={handleLeafletViewUpdate}
          />
        ) : (
          <Text>GPS is not granted</Text>
        )}
      </View>
      <View style={styles.ePaperMapPreviewContainer}>
        <Canvas ref={canvasRef} />
      </View>
      <FAB
        style={styles.fab}
        icon="cog"
        onPress={() => setOpenSettings(true)}
      />
      <SettingsDialog
        open={openSettings}
        onClose={() => setOpenSettings(false)}
      />
    </View>
  )
}

const valueStyle: StyleProp<TextStyle> = {
  flexGrow: 1,
  flexBasis: 0,
  fontWeight: 'bold',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-start',
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexGrow: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
  },
  stats: {
    paddingVertical: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    alignItems: 'stretch',
  },
  statsChild: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 160,
    flexDirection: 'row',
  },
  label: { ...valueStyle, textAlign: 'right', fontWeight: 'normal' },
  value: valueStyle,
  fab: {
    backgroundColor: cyan[500],
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  map: {
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ePaperMapPreviewContainer: {
    paddingVertical: 8,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
