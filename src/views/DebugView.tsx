import React, { useEffect, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import Canvas, { ImageData } from 'react-native-canvas'
import { Core } from '../core'
import { MapGeneratorV2, pixelRatio } from '../mapGeneratorV2'

export const DebugView = () => {
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

    const map = new MapGeneratorV2()

    // const dummyTour = new Map()
    let rotation = 0

    const update = () => {
      if (!mounted) {
        return
      }
      const start = Date.now()
      map.update(51.776894, 19.4281948, rotation, Core.instance.tour.getTour())
      rotation += Math.PI / 90
      if (rotation > Math.PI * 2) {
        rotation -= Math.PI * 2
      }
      const greyScaleData = map.getData()
      const data = new Array(greyScaleData.length * 4)
      for (let i = 0; i < greyScaleData.length; i++) {
        for (let j = 0; j < 3; j++) {
          data[i * 4 + j] = greyScaleData[i]
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

      console.log(
        'update time:',
        Date.now() - start,
        'ms; rotation:',
        Math.round((rotation * 180) / Math.PI),
        '°',
      )
      setTimeout(update, 100)
    }

    update()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <View style={styles.container}>
      <Canvas ref={canvasRef} style={styles.canvas} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvas: {
    transform: [{ scale: 8 }],
  },
})
