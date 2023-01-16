/* eslint-disable @typescript-eslint/ban-types */
import { useCallback, useEffect, useRef } from 'react'

type ArgumentTypes<F extends Function> = F extends (...args: infer A) => unknown
  ? A
  : never

export function useDebounce<T extends Function>(
  func: T,
  delay = 0,
  deps?: unknown[],
) {
  const isLoaded = useRef(true)
  const timeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      isLoaded.current = false
    }
  }, [])

  const debounce = useCallback(
    (...args: ArgumentTypes<typeof func>) => {
      if (timeout.current) {
        window.clearTimeout(timeout.current)
      }
      timeout.current = setTimeout(() => {
        if (isLoaded.current) {
          func(...args)
        }
      }, delay)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [delay, ...(deps ?? [func])],
  )

  return debounce
}
