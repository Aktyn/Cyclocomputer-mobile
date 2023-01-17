import { AppState } from 'react-native'
import BackgroundTimer from 'react-native-background-timer'

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

export function setBulletproofTimeout(callback: () => void, delay: number) {
  const isBackgroundState = !!AppState.currentState.match(/inactive|background/)
  if (isBackgroundState) {
    BackgroundTimer.setTimeout(callback, delay)
  } else {
    setTimeout(callback, delay)
  }
}

type ArgumentTypes<F extends (...args: never[]) => void> = F extends (
  ...args: infer A
) => void
  ? A
  : never

export function debounce<FunctionType extends (...args: never[]) => void>(
  func: FunctionType,
  delay?: number,
  options: Partial<{ forceAfterNumberOfAttempts: number }> = {},
) {
  let timeout: NodeJS.Timeout | null = null
  let attempts = 0

  const cancel = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  return {
    run: (...args: ArgumentTypes<typeof func>) => {
      if (
        options?.forceAfterNumberOfAttempts !== undefined &&
        options?.forceAfterNumberOfAttempts >= attempts
      ) {
        func(...args)
        cancel()
        attempts = 0
        return
      }

      cancel()
      attempts++
      timeout = setBulletproofTimeout(() => {
        timeout = null
        attempts = 0
        func(...args)
      }, delay ?? 16) as never
    },
    cancel,
  }
}
