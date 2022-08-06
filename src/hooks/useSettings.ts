import { useEffect, useMemo, useRef, useState } from 'react'
import { Core } from '../core'
import type { SettingsSchema } from '../core/settings'

export function useSettings() {
  const settingsMethodsRef = useRef({
    setSetting: Core.instance.settings.setSetting.bind(Core.instance.settings),
  })

  const [settings, setSettings] = useState(Core.instance.settings.getSettings())

  useEffect(() => {
    const handleSettingsChange = (newSettings: SettingsSchema) =>
      setSettings(newSettings)

    Core.instance.settings.on('settingsChange', handleSettingsChange)

    return () => {
      Core.instance.settings.off('settingsChange', handleSettingsChange)
    }
  }, [])

  const data = useMemo(
    () => ({ settings, ...settingsMethodsRef.current }),
    [settings],
  )

  return data
}
