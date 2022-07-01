import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { StyleProp, StyleSheet, TextStyle, View } from 'react-native'
import Canvas from 'react-native-canvas'
import {
  LeafletView,
  LatLng,
  WebviewLeafletMessage,
} from 'react-native-leaflet-view'
import { Subheading, Text } from 'react-native-paper'
import { useBluetooth } from '../bluetooth'
import { IncomingMessageType, MessageType } from '../bluetooth/message'
import { useGPS } from '../gps/useGPS'
import { MapGenerator } from '../mapGenerator'
import { useSnackbar } from '../snackbar/Snackbar'

const DEFAULT_ZOOM = 16

const parseImageData = (data: Uint8ClampedArray) => {
  const pixelsCount =
    MapGenerator.OUTPUT_RESOLUTION * MapGenerator.OUTPUT_RESOLUTION

  if (pixelsCount % 8 !== 0) {
    throw new Error('pixelsCount must be divisible by 8')
  }

  const monoHLSB = new Uint8Array((pixelsCount / 8) | 0)

  for (let y = 0; y < MapGenerator.OUTPUT_RESOLUTION; y++) {
    for (let x = 0; x < MapGenerator.OUTPUT_RESOLUTION; x++) {
      const i = y * MapGenerator.OUTPUT_RESOLUTION + x

      const r = data[i * 4 + 0]
      const g = data[i * 4 + 1]
      const b = data[i * 4 + 2]
      const tol = 16

      //TODO: reformat by using list of colors and tolerance value (tol)
      const isWhite = r > 255 - tol && g > 255 - tol && b > 255 - tol
      const isYellow =
        Math.abs(r - 0xf7) < tol &&
        Math.abs(g - 0xf9) < tol &&
        Math.abs(b - 0xc0) < tol

      const isOrange =
        Math.abs(r - 0xfc) < tol &&
        Math.abs(g - 0xd6) < tol &&
        Math.abs(b - 0xa4) < tol

      const v = isWhite || isYellow || isOrange ? 0 : 1

      //TODO: experiment with something like grey optical illusion by setting every other pixel differently
      monoHLSB[((pixelsCount - 1 - i) / 8) | 0] |= v << i % 8
    }
  }

  return monoHLSB
}

export const MapView = memo(() => {
  const { openSnackbar } = useSnackbar()
  const gps = useGPS()
  const { connectedDevices, sendData, messagesHandler } = useBluetooth()
  const cyclocomputer = connectedDevices[0] ?? { id: 'mock' }

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

  const sendMapPreview = useCallback(
    (imageData: Uint8ClampedArray) => {
      const parsedData = parseImageData(imageData)
      if (Date.now() - lastMapPreviewSendRef.current < 2000) {
        return
      }
      lastMapPreviewSendRef.current = Date.now()
      sendData(
        cyclocomputer.id,
        MessageType.SET_MAP_PREVIEW,
        parsedData.buffer,
      ).then((success) => {
        if (!success) {
          openSnackbar({ message: 'Cannot update circumference updated' })
        }
      })
    },
    [cyclocomputer.id, openSnackbar, sendData],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    mapGeneratorRef.current = new MapGenerator(canvas)
  }, [])

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
      mapGenerator
        .update(
          gps.coordinates.latitude,
          gps.coordinates.longitude,
          -((gps.coordinates.heading ?? 0) * Math.PI) / 180,
        )
        .then(sendMapPreview)
        .catch((e) => {
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
    gps.coordinates.heading,
    gps.coordinates.latitude,
    gps.coordinates.longitude,
    openSnackbar,
    sendMapPreview,
  ])

  //TODO: draw current route over map preview (loaded either from .gpx file or from komoot API)

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
        <Subheading style={styles.label}>Speed:&nbsp;</Subheading>
        <Subheading style={styles.value}>
          {(speed || gps.coordinates.speed).toFixed(2)}km/h
        </Subheading>
        <Subheading style={styles.label}>Altitude:&nbsp;</Subheading>
        <Subheading style={styles.value}>
          {gps.coordinates.altitude.toFixed(1)}m
        </Subheading>
        <Subheading style={styles.label}>Slope:&nbsp;</Subheading>
        <Subheading style={styles.value}>
          {gps.coordinates.slope.toFixed(1)}%
        </Subheading>
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
  minWidth: '40%',
  fontWeight: 'bold',
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',
  },
  stats: {
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
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
