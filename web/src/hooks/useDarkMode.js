import { useEffect } from 'react'
import { useAppStore } from '../store'

export function useDarkMode() {
  const darkMode = useAppStore((s) => s.darkMode)

  useEffect(() => {
    const root = document.documentElement
    const applyTheme = (isDark) => {
      root.setAttribute('data-theme', isDark ? 'dark' : 'light')
    }

    if (darkMode === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(mq.matches)
      const handler = (e) => applyTheme(e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    } else {
      applyTheme(darkMode === 'dark')
    }
  }, [darkMode])
}
