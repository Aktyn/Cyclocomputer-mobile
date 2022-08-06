import { useEffect, useState } from 'react'
import { Core } from '../core'
import type { ProgressDataBase } from '../core/progress'

export function useProgress() {
  const [progressStats, setProgressStats] = useState(
    Core.instance.progress.dataBase,
  )

  useEffect(() => {
    const handleProgressUpdate = (data: ProgressDataBase) => {
      setProgressStats(data)
    }

    Core.instance.progress.on('update', handleProgressUpdate)

    return () => {
      Core.instance.progress.off('update', handleProgressUpdate)
    }
  }, [])

  return progressStats
}
