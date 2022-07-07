import { useEffect, useState } from 'react'
import { core } from '../core'
import type { WeatherSchema } from '../core/weather'

export function useWeather() {
  const [weather, setWeather] = useState<WeatherSchema | null>(
    core.weather.getWeather(),
  )

  useEffect(() => {
    const handleWeatherUpdate = (currentWeather: WeatherSchema | null) =>
      setWeather(currentWeather)

    core.weather.on('update', handleWeatherUpdate)

    return () => {
      core.weather.off('update', handleWeatherUpdate)
    }
  }, [])

  return weather
}
