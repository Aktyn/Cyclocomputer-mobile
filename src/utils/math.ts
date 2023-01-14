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

/** Converts latitude, longitude and zoom to tile coordinates */
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

export function dotProduct(
  vector1: readonly [number, number],
  vector2: readonly [number, number],
) {
  return vector1[0] * vector2[0] + vector1[1] * vector2[1]
}

export function vectorLength(vector: readonly [number, number]) {
  return Math.sqrt(vector[0] ** 2 + vector[1] ** 2)
}

export function normalizeVector(
  vector: readonly [number, number],
): [number, number] {
  const length = vectorLength(vector)
  return [vector[0] / length, vector[1] / length]
}

export function rotateVector(
  vector: readonly [number, number],
  angle: number,
): [number, number] {
  return [
    vector[0] * Math.cos(angle) - vector[1] * Math.sin(angle),
    vector[0] * Math.sin(angle) + vector[1] * Math.cos(angle),
  ]
}
