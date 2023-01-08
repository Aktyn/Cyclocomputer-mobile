import { useCallback, useEffect, useRef } from 'react'

export default function useCancellablePromise() {
  const promises = useRef<
    { promise: Promise<unknown>; cancel: () => void; restore: () => void }[]
  >([])

  useEffect(() => {
    promises.current?.forEach((p) => p.restore())
    return () => {
      promises.current?.forEach((p) => p.cancel())
      promises.current = []
    }
  }, [])

  const cancellablePromise = useCallback(
    <T extends Promise<unknown>>(promise: T): T => {
      let isCanceled = false

      const wrappedPromise = new Promise<unknown>((resolve, reject) => {
        promise
          .then((val) => (isCanceled ? reject(null) : resolve(val)))
          .catch((error) => (isCanceled ? reject(null) : reject(error)))
      }) as T

      promises.current?.push({
        promise: wrappedPromise,
        cancel: () => {
          isCanceled = true
        },
        restore: () => {
          isCanceled = false
        },
      })

      return wrappedPromise
    },
    [],
  )

  return cancellablePromise
}
