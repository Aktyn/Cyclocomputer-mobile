export const degreeToRadian = (degree: number) => {
  return (degree * Math.PI) / 180
}

export const distanceBetweenEarthCoordinatesInKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const earthRadiusInKm = 6371

  const dLat = degreeToRadian(lat2 - lat1)
  const dLon = degreeToRadian(lon2 - lon1)

  lat1 = degreeToRadian(lat1)
  lat2 = degreeToRadian(lat2)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return earthRadiusInKm * c
}

/** Converts latitude, longitude, zoom to tile coordinates */
export function convertLatLongToTile(
  latitude: number,
  longitude: number,
  zoom: number,
) {
  const lat_rad = (latitude / 180) * Math.PI
  const n = 2 ** zoom
  return {
    x: ((longitude + 180.0) / 360.0) * n,
    y: ((1.0 - Math.asinh(Math.tan(lat_rad)) / Math.PI) / 2.0) * n,
  }
}
