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
  roundTo: (typeof timeUnits)[number]['name'] = 's',
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
