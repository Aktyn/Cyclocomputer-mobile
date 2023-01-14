export function metersPerSecondToKilometersPerHour(mps: number) {
  return mps * 3.6
}

export const int = (value?: string) => parseInt(value ?? '', 10) || 0
export const float = (value?: string) => parseFloat(value ?? '') || 0

export const last = <T>(array: T[]) => array[array.length - 1]

export function tryParseJSON<FallbackType>(
  jsonString: string,
  fallbackValue?: FallbackType,
): FallbackType

export function tryParseJSON<FallbackType = undefined>(
  jsonString: string,
  fallbackValue?: FallbackType,
): unknown | null

export function tryParseJSON<FallbackType = undefined>(
  jsonString: string,
  fallbackValue?: FallbackType,
) {
  try {
    return JSON.parse(jsonString)
  } catch (e) {
    return fallbackValue ?? null
  }
}
