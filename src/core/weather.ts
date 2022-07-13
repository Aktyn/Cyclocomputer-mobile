import EventEmitter from 'events'

export interface WeatherSchema {
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

/** 5 minutes */
const UPDATES_FREQUENCY = 300000
const API_KEY = '56be76c13353c6935bf371100a953b3f'

declare interface WeatherEventEmitter {
  on(event: 'update', listener: (weather: WeatherSchema | null) => void): this
  off(event: 'update', listener: (weather: WeatherSchema | null) => void): this
  emit(event: 'update', weather: WeatherSchema | null): boolean
}

class WeatherEventEmitter extends EventEmitter {}

export class Weather extends WeatherEventEmitter {
  private weather: WeatherSchema | null = null
  private currentWeatherCoordinates = {
    latitude: 0,
    longitude: 0,
  }
  private updateTimestamp = 0

  constructor() {
    super()
  }

  destroy() {
    //
  }

  getWeather() {
    return this.weather
  }

  /** Should be called only from Core */
  async updateWeather(latitude: number, longitude: number) {
    if (
      Date.now() - this.updateTimestamp < UPDATES_FREQUENCY ||
      (latitude === this.currentWeatherCoordinates.latitude &&
        longitude === this.currentWeatherCoordinates.longitude)
    ) {
      return
    }

    this.updateTimestamp = Date.now()
    this.currentWeatherCoordinates = {
      latitude,
      longitude,
    }
    try {
      const weather = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`,
        { method: 'GET' },
      ).then((res) => res.json())

      this.weather = weather
      this.emit('update', this.weather)
    } catch (e) {
      this.weather = null
      this.emit('update', this.weather)

      // eslint-disable-next-line no-console
      console.error(
        `Cannot fetch weather data: ${
          e instanceof Error ? e.message : String(e)
        }`,
      )
    }
  }
}
