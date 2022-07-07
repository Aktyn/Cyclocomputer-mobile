import { useEffect, useMemo, useRef, useState } from 'react'
import { core } from '../core'
import type { SettingsSchema } from '../core/settings'

export function useSettings() {
  const settingsMethodsRef = useRef({
    setSetting: core.settings.setSetting.bind(core.settings),
  })

  const [settings, setSettings] = useState(core.settings.getSettings())

  useEffect(() => {
    const handleSettingsChange = (newSettings: SettingsSchema) =>
      setSettings(newSettings)

    core.settings.on('settingsChange', handleSettingsChange)

    return () => {
      core.settings.off('settingsChange', handleSettingsChange)
    }
  }, [])

  const data = useMemo(
    () => ({ settings, ...settingsMethodsRef.current }),
    [settings],
  )

  return data
}
