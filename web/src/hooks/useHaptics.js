import { useAppStore } from '../store'

/**
 * Haptics hook — wraps navigator.vibrate with app settings.
 * On mobile native: expo-haptics would be used instead.
 */
export function useHaptics() {
  const haptics = useAppStore((s) => s.haptics)

  const vibrate = (pattern) => {
    if (!haptics.enabled) return
    if (!haptics.silentMode) {
      // On web: check if vibrate is supported
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern)
      }
    }
  }

  return {
    tap: () => vibrate(haptics.patterns.tap),
    success: () => vibrate(haptics.patterns.success),
    error: () => vibrate(haptics.patterns.error),
    heavy: () => vibrate(haptics.patterns.heavy),
    capture: () => vibrate(haptics.patterns.capture),
    custom: (pattern) => vibrate(pattern),
  }
}
