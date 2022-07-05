import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Buffer } from '@craftzdog/react-native-buffer'
import { cyan } from 'material-ui-colors'
import { StyleProp, StyleSheet, TextStyle, View } from 'react-native'
import Canvas from 'react-native-canvas'
import {
  LeafletView,
  LatLng,
  WebviewLeafletMessage,
  MapShapeType,
  MapShape,
} from 'react-native-leaflet-view'
import { Subheading, Text } from 'react-native-paper'
import { useBluetooth } from '../bluetooth'
import { IncomingMessageType, MessageType } from '../bluetooth/message'
import { CompassWidget } from '../components/CompassWidget'
import { useGPS } from '../gps/useGPS'
import useCancellablePromise from '../hooks/useCancellablePromise'
import { useTour } from '../hooks/useTour'
import { MapGenerator } from '../mapGenerator'
import { useSettings } from '../settings'
import { useSnackbar } from '../snackbar/Snackbar'
import { clamp } from '../utils'

const DEFAULT_ZOOM = 16

const parseImageData = (data: Uint8ClampedArray) => {
  const pixelsCount =
    MapGenerator.OUTPUT_RESOLUTION * MapGenerator.OUTPUT_RESOLUTION

  if (pixelsCount % 8 !== 0) {
    throw new Error('pixelsCount must be divisible by 8')
  }

  const monoHLSB = new Uint8Array((pixelsCount / 8) | 0)

  const roadColors = [
    // // White
    // { r: 255, g: 255, b: 255 },

    // // Yellow
    // { r: 0xf7, g: 0xf9, b: 0xc0 },

    // // Orange
    // { r: 0xfc, g: 0xd6, b: 0xa4 },

    // Black
    { r: 0x00, g: 0x00, b: 0x00 },

    // Grey
    // { r: 0x74, g: 0x74, b: 0x74 }, //Needs tolerance value at about 64
  ]

  const routeColors = [
    // Cyan
    { r: 0x55, g: 0xff, b: 0xff },
  ]

  for (let y = 0; y < MapGenerator.OUTPUT_RESOLUTION; y++) {
    for (let x = 0; x < MapGenerator.OUTPUT_RESOLUTION; x++) {
      const i = y * MapGenerator.OUTPUT_RESOLUTION + x

      const r = data[i * 4 + 0]
      const g = data[i * 4 + 1]
      const b = data[i * 4 + 2]
      const tol = 16

      const isRoadColor = roadColors.some(
        (color) =>
          Math.abs(r - color.r) < tol &&
          Math.abs(g - color.g) < tol &&
          Math.abs(b - color.b) < tol,
      )
      const isRouteColor = routeColors.some(
        (color) =>
          Math.abs(r - color.r) < tol &&
          Math.abs(g - color.g) < tol &&
          Math.abs(b - color.b) < tol,
      )

      const v = isRouteColor ? (y + (x % 2)) % 2 : isRoadColor ? 0 : 1

      //TODO: experiment with something like grey optical illusion by setting every other pixel differently
      monoHLSB[((pixelsCount - 1 - i) / 8) | 0] |= v << i % 8
    }
  }

  return monoHLSB
}

export const MapView = memo(() => {
  const cancellable = useCancellablePromise()
  const { openSnackbar } = useSnackbar()
  const { settings } = useSettings()
  const gps = useGPS()
  const { connectedDevices, sendData, messagesHandler } = useBluetooth()
  const cyclocomputer = connectedDevices[0] ?? { id: 'mock' }
  const tour = useTour()

  const canvasRef = useRef<Canvas>(null)
  const mapGeneratorRef = useRef<MapGenerator>()
  const updateInfoRef = useRef({ updating: false, pendingUpdate: false })
  const lastMapPreviewSendRef = useRef<number>(0)

  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [speed, setSpeed] = useState(0)

  useEffect(() => {
    const handleMessage = (message: IncomingMessageType, data: Uint8Array) => {
      if (message === IncomingMessageType.UPDATE_SPEED) {
        setSpeed(Buffer.from(data).readFloatLE(0))
      }
    }

    messagesHandler.on(handleMessage)

    return () => {
      messagesHandler.off(handleMessage)
    }
  }, [messagesHandler])

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

  const sendMapPreview = useCallback(
    (imageData: Uint8ClampedArray) => {
      const parsedData = parseImageData(imageData)
      if (Date.now() - lastMapPreviewSendRef.current < 2000) {
        return
      }
      lastMapPreviewSendRef.current = Date.now()
      cancellable(
        sendData(
          cyclocomputer.id,
          MessageType.SET_MAP_PREVIEW,
          parsedData.buffer,
        ),
      )
        .then((success) => {
          if (!success) {
            openSnackbar({ message: 'Cannot update circumference updated' })
          }
        })
        .catch(() => undefined)
    },
    [cancellable, cyclocomputer.id, openSnackbar, sendData],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    mapGeneratorRef.current = new MapGenerator(canvas, settings.mapZoom)
  }, [settings.mapZoom])

  useEffect(() => {
    const mapGenerator = mapGeneratorRef.current
    if (!mapGenerator) {
      return
    }

    if (updateInfoRef.current.updating) {
      updateInfoRef.current.pendingUpdate = true
      return
    }

    const update = () => {
      updateInfoRef.current.updating = true
      cancellable(
        mapGenerator.update(
          gps.coordinates.latitude,
          gps.coordinates.longitude,
          -((gps.coordinates.heading ?? 0) * Math.PI) / 180,
          tour,
        ),
      )
        .then(sendMapPreview)
        .catch((e) => {
          e &&
            openSnackbar({
              message: `Failed to update map: ${
                e instanceof Error ? e.message : String(e)
              }`,
            })
        })
    }

    update()
    if (updateInfoRef.current.pendingUpdate) {
      updateInfoRef.current.pendingUpdate = false
      update()
    } else {
      updateInfoRef.current.updating = false
    }
  }, [
    cancellable,
    gps.coordinates.heading,
    gps.coordinates.latitude,
    gps.coordinates.longitude,
    openSnackbar,
    sendMapPreview,
    tour,
  ])

  useEffect(() => {
    cancellable(
      sendData(
        cyclocomputer.id,
        MessageType.SET_GPS_STATISTICS,
        new Uint8Array(
          Float32Array.from([
            gps.coordinates.altitude,
            gps.coordinates.slope,
            gps.coordinates.heading,
          ]).buffer,
        ).buffer,
      ),
    )
      .then((success) => {
        if (!success) {
          openSnackbar({ message: 'Cannot send gps statistics update' })
        }
      })
      .catch(() => undefined)
  }, [
    cancellable,
    cyclocomputer.id,
    gps.coordinates.altitude,
    gps.coordinates.heading,
    gps.coordinates.slope,
    openSnackbar,
    sendData,
  ])

  const handleLeafletViewUpdate = (message: WebviewLeafletMessage) => {
    if (
      message.payload?.zoom &&
      zoom !== message.payload.zoom &&
      message.payload.zoom > 6
    ) {
      setZoom(message.payload.zoom)
    }
  }

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
    </View>
  )
})

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
    display: 'flex',
    alignItems: 'center',
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
