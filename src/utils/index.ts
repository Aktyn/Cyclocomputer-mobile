import { AppState } from 'react-native'
import BackgroundTimer from 'react-native-background-timer'
import { diacriticsMap } from './consts'

export * from './math'

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export const int = (value?: string) => parseInt(value ?? '', 10) || 0
export const float = (value?: string) => parseFloat(value ?? '') || 0

export function pick<ObjectType, Key extends Extract<keyof ObjectType, string>>(
  object: ObjectType,
  ...keys: Key[]
) {
  const picked = {} as Pick<ObjectType, Key>
  for (const key of keys) {
    picked[key] = object[key]
  }
  return picked
}

export function omit<ObjectType, Key extends Extract<keyof ObjectType, string>>(
  object: ObjectType,
  ...keys: Key[]
) {
  const omitted = {} as Omit<ObjectType, Key>
  const keysSet = new Set<Extract<keyof ObjectType, string>>(keys)
  for (const objectKey in object) {
    if (!keysSet.has(objectKey)) {
      omitted[objectKey as unknown as Exclude<keyof ObjectType, Key>] =
        object[objectKey as unknown as Exclude<keyof ObjectType, Key>]
    }
  }
  return omitted
}

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

export function removeDiacritics(str: string) {
  return str.normalize('NFC').replace(
    // eslint-disable-next-line no-control-regex
    /[^\u0000-\u007E]/g,
    (char) => diacriticsMap[char as keyof typeof diacriticsMap] || char,
  )
}

export const setBulletproofTimeout = (callback: () => void, delay: number) => {
  const isBackgroundState = !!AppState.currentState.match(/inactive|background/)
  if (isBackgroundState) {
    BackgroundTimer.setTimeout(callback, delay)
  } else {
    setTimeout(callback, delay)
  }
}

export const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setBulletproofTimeout(resolve, ms)
  })

export const waitFor = async (
  condition: () => boolean,
  timeout = 4000,
  checksInterval = 16,
) => {
  const start = Date.now()
  do {
    if (condition()) {
      return
    }
    await wait(checksInterval)
  } while (Date.now() - start < timeout)
  throw new Error('timeout')
}

export type ArgumentTypes<F extends (...args: never[]) => void> = F extends (
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

export const last = <T>(array: T[], rightOffset = 0): T | undefined =>
  array[array.length - 1 - rightOffset]

interface ParseTimestampOptions {
  noDateSymbol: string
  onlyDate: boolean
  onlyTime: boolean
}

export function parseTimestamp(
  timestamp?: number | Date,
  opts: Partial<ParseTimestampOptions> = {},
) {
  if (timestamp === null || timestamp === undefined) {
    return opts.noDateSymbol ?? '-'
  }

  const dt = timestamp instanceof Date ? timestamp : new Date(timestamp)
  const locale = 'pl'

  if (opts.onlyDate && !opts.onlyTime) {
    return dt.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } else if (opts.onlyTime) {
    return dt.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return dt.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Note .reverse() after this array
const timeUnits = [
  {
    name: 'ms' as const,
    scale: 1,
  },
  {
    name: 's' as const,
    scale: 1000,
  },
  {
    name: 'm' as const,
    scale: 1000 * 60,
  },
  {
    name: 'h' as const,
    scale: 1000 * 60 * 60,
  },
  {
    name: 'd' as const,
    scale: 1000 * 60 * 60 * 24,
  },
].reverse()

export function parseTime(
  milliseconds: number,
  roundTo: typeof timeUnits[number]['name'] = 's',
) {
  if (typeof milliseconds !== 'number') {
    return 'Incorrect time'
  }

  const roundIndex = timeUnits.findIndex(({ name }) => name === roundTo)
  if (milliseconds === 0 || milliseconds < timeUnits[roundIndex].scale) {
    return `0 ${roundTo}`
  }

  milliseconds = Math.round(milliseconds)

  const unitStrings = timeUnits.reduce((unitStringsBuilder, unit, index) => {
    if (index <= roundIndex && milliseconds >= unit.scale) {
      const unitValue = Math.floor(milliseconds / unit.scale)
      if (unitValue > 0) {
        milliseconds -= unitValue * unit.scale
        unitStringsBuilder.push(`${unitValue} ${unit.name}`)
      }
    }

    return unitStringsBuilder
  }, [] as string[])

  if (unitStrings.length >= 2) {
    unitStrings.splice(unitStrings.length - 1, 0, 'and')
  }
  return unitStrings.join(' ')
}
