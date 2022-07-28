import { useEffect, useState } from 'react'
import { core } from '../core'
import type { ProgressDataBase } from '../core/progress'

export function useProgress() {
  const [progressStats, setProgressStats] = useState(core.progress.dataBase)

  useEffect(() => {
    const handleProgressUpdate = (data: ProgressDataBase) => {
      setProgressStats(data)
    }

    core.progress.on('update', handleProgressUpdate)

    return () => {
      core.progress.off('update', handleProgressUpdate)
    }
  }, [])

  return progressStats
}
