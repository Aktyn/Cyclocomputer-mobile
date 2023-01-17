import { useEffect, useRef } from 'react'
import type { LocationObject } from 'expo-location'
import { StyleSheet, View } from 'react-native'
import Canvas, { ImageData } from 'react-native-canvas'
import { Button } from 'react-native-paper'
import { locationModule } from '../modules/location'
import { MapGeneratorV2, pixelRatio } from '../modules/map/mapGenerator'
import { settingsModule } from '../modules/settings'
import { tourModule } from '../modules/tour'
import { degreeToRadian } from '../utils'

interface DebugViewProps {
  onReturn: () => void
}

export function DebugView({ onReturn }: DebugViewProps) {
  const canvasRef = useRef<Canvas>(null)

  useEffect(() => {
    let mounted = true

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

    let map = new MapGeneratorV2(settingsModule.settings.mapZoom)

    const redraw = () => {
      const greyScaleData = map.data
      const data = new Array(greyScaleData.length * 4)
      for (let i = 0; i < greyScaleData.length; i++) {
        for (let j = 0; j < 3; j++) {
          const v =
            greyScaleData[i] < settingsModule.settings.grayscaleTolerance
              ? 0
              : 255
          data[i * 4 + j] = v
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

    const update = ({ coords }: LocationObject) => {
      if (!mounted) {
        return
      }

      if (map.zoom !== settingsModule.settings.mapZoom) {
        map = new MapGeneratorV2(settingsModule.settings.mapZoom)
      }

      const start = Date.now()
      map.update(
        coords.latitude,
        coords.longitude,
        degreeToRadian(coords.heading ?? 0),
        tourModule.selectedTour,
      )

      redraw()

      // eslint-disable-next-line no-console
      console.log('update time:', Date.now() - start, 'ms')
    }

    locationModule.emitter.on('locationUpdate', update)

    return () => {
      mounted = false
      locationModule.emitter.off('locationUpdate', update)
    }
  }, [])

  return (
    <View style={styles.container}>
      <Canvas ref={canvasRef} style={styles.canvas} />
      <View style={styles.bottomSection}>
        <Button mode="contained" icon="chevron-left" onPress={onReturn}>
          Return to map
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    flexGrow: 1,
    paddingVertical: 16,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  canvas: {
    transform: [{ translateY: MapGeneratorV2.OUTPUT_RESOLUTION }, { scale: 6 }],
  },
  divider: {
    marginVertical: 8,
    height: 1,
  },
  bottomSection: { alignItems: 'center', flexGrow: 0 },
})
