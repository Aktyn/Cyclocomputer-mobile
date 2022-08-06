import { useEffect, useState } from 'react'
import { Core } from '../core'
import type { WeatherSchema } from '../core/weather'

export function useWeather() {
  const [weather, setWeather] = useState<WeatherSchema | null>(
    Core.instance.weather.getWeather(),
  )

  useEffect(() => {
    const handleWeatherUpdate = (currentWeather: WeatherSchema | null) =>
      setWeather(currentWeather)

    Core.instance.weather.on('update', handleWeatherUpdate)

    return () => {
      Core.instance.weather.off('update', handleWeatherUpdate)
    }
  }, [])

  return weather
}
