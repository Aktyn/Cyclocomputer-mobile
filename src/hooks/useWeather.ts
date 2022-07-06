import { useEffect, useRef, useState } from 'react'
import { useSnackbar } from '../snackbar/Snackbar'

interface Weather {
  coord: {
    lon: number
    lat: number
  }
  weather: {
    id: number
    main: string
    description: string
    icon: string
  }[]
  base: string
  main: {
    temp: number
    feels_like: number
    temp_min: number
    temp_max: number
    pressure: number
    humidity: number
  }
  visibility: number
  wind: {
    /** Wind speed. Unit Default: meter/sec, Metric: meter/sec, Imperial: miles/hour. */
    speed: number
    /** Wind direction, degrees (meteorological) */
    deg: number
  }
  clouds: {
    all: number
  }
  dt: number
  sys: {
    type: number
    id: number
    message: number
    country: string
    sunrise: number
    sunset: number
  }
  timezone: number
  id: number
  /** City name */
  name: string
  cod: number
}

const API_KEY = '56be76c13353c6935bf371100a953b3f'
/** 5 minutes */
const UPDATES_FREQUENCY = 300000

export function useWeather(latitude: number, longitude: number) {
  const { openSnackbar } = useSnackbar()

  const updateTimestampRef = useRef(0)
  const [weather, setWeather] = useState<Weather | null>(null)

  useEffect(() => {
    if (
      Date.now() - updateTimestampRef.current < UPDATES_FREQUENCY ||
      (latitude === 0 && longitude === 0)
    ) {
      return
    }
    updateTimestampRef.current = Date.now()
    fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`,
      { method: 'GET' },
    )
      .then((res) => res.json())
      .then(setWeather)
      .catch((e) =>
        openSnackbar({
          message: `Cannot fetch weather data: ${
            e instanceof Error ? e.message : String(e)
          }`,
        }),
      )
  }, [latitude, longitude, openSnackbar])

  return weather
}
