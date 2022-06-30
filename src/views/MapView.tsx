import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Canvas from 'react-native-canvas'
import {
  LeafletView,
  LatLng,
  WebviewLeafletMessage,
} from 'react-native-leaflet-view'
import { Text } from 'react-native-paper'
import { useBluetooth } from '../bluetooth/Bluetooth'
import { MessageType } from '../bluetooth/message'
import { useGPS } from '../gps/useGPS'
import { MapGenerator } from '../mapGenerator'
import { useSnackbar } from '../snackbar/Snackbar'
// import { Buffer } from '@craftzdog/react-native-buffer'

const DEFAULT_ZOOM = 16

const parseImageData = (data: Uint8ClampedArray) => {
  const pixelsCount =
    MapGenerator.OUTPUT_RESOLUTION * MapGenerator.OUTPUT_RESOLUTION

  if (pixelsCount % 8 !== 0) {
    throw new Error('pixelsCount must be divisible by 8')
  }

  const monoHLSB = new Uint8Array((pixelsCount / 8) | 0)

  for (let i = 0; i < pixelsCount; i++) {
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
    monoHLSB[(i / 8) | 0] |= v << (7 - (i % 8))
  }

  return monoHLSB
}

export const MapView = () => {
  const { openSnackbar } = useSnackbar()
  const gps = useGPS()
  const { connectedDevices, sendData } = useBluetooth()
  const cyclocomputer = connectedDevices[0] ?? { id: 'mock' }

  const canvasRef = useRef<Canvas>(null)
  const mapGeneratorRef = useRef<MapGenerator>()
  const updateInfoRef = useRef({ updating: false, pendingUpdate: false })

  const [zoom, setZoom] = useState(DEFAULT_ZOOM)

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

  //TODO: altitude and current slope information
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
      <Text>{gps.granted ? 'GPS is granted' : 'GPS is not granted'}</Text>
      <Text>Latitude:&nbsp;{gps.coordinates.latitude}</Text>
      <Text>Longitude:&nbsp;{gps.coordinates.longitude}</Text>
      <View style={styles.map}>
        <LeafletView
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
      </View>
      <View style={styles.ePaperMapPreviewContainer}>
        <Canvas ref={canvasRef} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',
  },
  map: {
    flexGrow: 1,
    width: '100%',
  },
  ePaperMapPreviewContainer: {
    minHeight: 160,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
