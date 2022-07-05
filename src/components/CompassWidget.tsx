import { useEffect, useRef } from 'react'
import { red } from 'material-ui-colors'
import { StyleSheet, View } from 'react-native'
import Canvas from 'react-native-canvas'
import { Text } from 'react-native-paper'

interface CompassWidgetProps {
  size: number
  direction: number
}

export const CompassWidget = ({ size, direction }: CompassWidgetProps) => {
  const canvasRef = useRef<Canvas>(null)

  useEffect(() => {
    if (!canvasRef.current) {
      return
    }
    const canvas = canvasRef.current
    canvas.width = size
    canvas.height = size

    const ctx = canvas.getContext('2d')

    const radius = size / 2
    const angle = (direction * Math.PI) / 180

    ctx.strokeStyle = ctx.fillStyle = '#fff'
    ctx.lineWidth = 1

    ctx.beginPath()
    ctx.arc(radius, radius, radius - 1, 0, 2 * Math.PI)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(radius, radius)
    ctx.lineTo(
      (1 + Math.cos(angle - Math.PI / 2)) * radius,
      (1 + Math.sin(angle - Math.PI / 2)) * radius,
    )
    ctx.stroke()

    for (let i = 0; i < 4; i++) {
      const tickAngle = (i * Math.PI) / 2
      ctx.strokeStyle = '#fffa'
      ctx.beginPath()
      ctx.moveTo(
        (1 + Math.cos(tickAngle)) * radius,
        (1 + Math.sin(tickAngle)) * radius,
      )
      ctx.lineTo(
        radius + Math.cos(tickAngle) * (radius * 0.618),
        radius + Math.sin(tickAngle) * (radius * 0.618),
      )
      ctx.stroke()
    }
  }, [size, direction])

  return (
    <View style={styles.container}>
      <Text style={styles.text}>N</Text>
      <Canvas ref={canvasRef} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  text: {
    fontSize: 10,
    fontWeight: 'bold',
    height: 12,
    marginTop: -12,
    color: red[200],
  },
})
