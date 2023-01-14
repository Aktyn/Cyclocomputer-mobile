export function metersPerSecondToKilometersPerHour(mps: number) {
  return mps * 3.6
}

export const int = (value?: string) => parseInt(value ?? '', 10) || 0
export const float = (value?: string) => parseFloat(value ?? '') || 0

export const last = <T>(array: T[]) => array[array.length - 1]

export function logError(error: unknown, messagePrefix?: string) {
  if (error) {
    console.error(
      `${messagePrefix}${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}
