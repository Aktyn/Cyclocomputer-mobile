import { useEffect, useState } from 'react'
import { core } from '../core'
import type { ClusteredTour } from '../core/tour'

export function useTour() {
  const [tour, setTour] = useState(core.tour.getTour())

  useEffect(() => {
    const handleTourUpdate = (newTour: ClusteredTour) => setTour(newTour)

    core.tour.on('tourUpdate', handleTourUpdate)

    return () => {
      core.tour.off('tourUpdate', handleTourUpdate)
    }
  }, [])

  return tour
}
