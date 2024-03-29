import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Buffer } from '@craftzdog/react-native-buffer'
import { cyan } from 'material-ui-colors'
import type { StyleProp, TextStyle } from 'react-native'
import { StyleSheet, View } from 'react-native'
import Canvas, { ImageData } from 'react-native-canvas'
import type {
  LatLng,
  MapShape,
  WebviewLeafletMessage,
} from 'react-native-leaflet-view'
import { MapShapeType, LeafletView } from 'react-native-leaflet-view'
import { FAB, Subheading, Text } from 'react-native-paper'
import { CompassWidget } from '../components/CompassWidget'
import { Core } from '../core'
import { MapGeneratorV2, pixelRatio } from '../core/map/mapGeneratorV2'
import { IncomingMessageType } from '../core/message'
import { useGPS } from '../hooks/useGPS'
import { useProgress } from '../hooks/useProgress'
import { useSettings } from '../hooks/useSettings'
import { useTour } from '../hooks/useTour'
import { useWeather } from '../hooks/useWeather'
import { clamp, parseTime } from '../utils'
import { SettingsDialog } from './settings/SettingsDialog'

const DEFAULT_ZOOM = 16

export const MainView = () => {
  const canvasRef = useRef<Canvas>(null)

  const gps = useGPS()
  const tour = useTour()
  const weather = useWeather()
  const progress = useProgress()
  const { settings } = useSettings()

  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [speed, setSpeed] = useState(0)
  const [openSettings, setOpenSettings] = useState(false)

  useEffect(() => {
    const handleMessage = (message: IncomingMessageType, data: Uint8Array) => {
      if (message === IncomingMessageType.UPDATE_SPEED) {
        setSpeed(Buffer.from(data).readFloatLE(0))
      }
    }

    Core.instance.bluetooth.on('message', handleMessage)

    return () => {
      Core.instance.bluetooth.off('message', handleMessage)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const RES = MapGeneratorV2.OUTPUT_RESOLUTION / pixelRatio

    canvas.width = RES
    canvas.height = RES

    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff0'
    ctx.fillRect(0, 0, RES, RES)

    const handleMapUpdate = (greyScaleData: Uint8Array | Uint8ClampedArray) => {
      const data = new Array(greyScaleData.length * 4)
      for (let i = 0; i < greyScaleData.length; i++) {
        const color = greyScaleData[i] < settings.grayscaleTolerance ? 0 : 255
        for (let j = 0; j < 3; j++) {
          data[i * 4 + j] = color
        }
        data[i * 4 + 3] = 255
      }
      const imageData = new ImageData(
        canvas,
        data,
        MapGeneratorV2.OUTPUT_RESOLUTION,
        MapGeneratorV2.OUTPUT_RESOLUTION,
      )
      ctx.putImageData(imageData, 0, 0)
    }

    Core.instance.on('mapUpdate', handleMapUpdate)

    return () => {
      Core.instance.off('mapUpdate', handleMapUpdate)
    }
  }, [settings.grayscaleTolerance])

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
        {weather && (
          <>
            <View style={styles.statsChild}>
              <Subheading style={styles.label}>City:&nbsp;</Subheading>
              <Subheading
                style={styles.value}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
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
        <View style={styles.statsChild}>
          <Subheading style={styles.label}>Speed:&nbsp;</Subheading>
          <Subheading style={styles.value}>
            {Math.round(speed || (gps.coordinates.speed * 3600) / 1000)}
            &nbsp;km/h
          </Subheading>
        </View>
        <View style={styles.statsChild}>
          <Subheading style={styles.label}>Altitude:&nbsp;</Subheading>
          <Subheading style={styles.value}>
            {clamp(progress.currentAltitude ?? 0, -10000, 10000).toFixed(1)}m
          </Subheading>
        </View>
        <View style={styles.statsChild}>
          <Subheading style={styles.label}>Slope:&nbsp;</Subheading>
          <Subheading style={styles.value}>
            {progress.currentSlope.toFixed(1)}%
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
        <View style={styles.statsChild}>
          <Subheading style={styles.label}>Traveled:&nbsp;</Subheading>
          <Subheading style={styles.value}>
            {progress.traveledDistance.toFixed(1)}km
          </Subheading>
        </View>
        <View style={styles.statsChild}>
          <Subheading style={styles.label}>Ride time:&nbsp;</Subheading>
          <Subheading style={styles.value}>
            {parseTime(progress.rideDuration, 'm')}
          </Subheading>
        </View>
        <View style={styles.statsChild}>
          <Subheading style={styles.label}>Altitude:&nbsp;{'\n'}</Subheading>
          <View style={styles.valueBase}>
            <Subheading style={styles.value}>
              {progress.altitudeChange.up.toFixed(0)}m↗
            </Subheading>
            <Subheading style={styles.value}>
              {progress.altitudeChange.down.toFixed(0)}m↘
            </Subheading>
          </View>
        </View>
        <View style={styles.statsChild}>
          <Subheading style={styles.label} numberOfLines={1}>
            Motion time:&nbsp;
          </Subheading>
          <Subheading style={styles.value}>
            {parseTime(progress.timeInMotion, 'm')}
          </Subheading>
        </View>
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
      <View style={styles.generatedMap}>
        <Canvas ref={canvasRef} style={styles.canvas} />
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

const valueBaseStyle: StyleProp<TextStyle> = {
  flexGrow: 1,
  flexBasis: 0,
}

const valueStyle: StyleProp<TextStyle> = {
  ...valueBaseStyle,
  fontWeight: 'bold',
  flexDirection: 'row',
  alignItems: 'flex-start',
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
  label: {
    ...valueStyle,
    textAlign: 'right',
    fontWeight: 'normal',
    fontSize: 14,
  },
  valueBase: valueBaseStyle,
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
  generatedMap: {
    minHeight: 192,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff2',
  },
  canvas: {
    transform: [{ scale: 5 }],
  },
})
