import { useEffect, useState } from 'react'
import { Core } from '../core'
import type { ClusteredTour } from '../core/tour'

export function useTour() {
  const [tour, setTour] = useState(Core.instance.tour.getTour())

  useEffect(() => {
    const handleTourUpdate = (newTour: ClusteredTour) => setTour(newTour)

    Core.instance.tour.on('tourUpdate', handleTourUpdate)

    return () => {
      Core.instance.tour.off('tourUpdate', handleTourUpdate)
    }
  }, [])

  return tour
}
