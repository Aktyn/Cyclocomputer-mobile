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

export function tryParseJSON<FallbackType = null>(
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

export const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

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
