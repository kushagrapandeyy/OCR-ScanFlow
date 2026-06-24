import { useState, useRef } from 'react'

export function usePullRefresh(onRefresh) {
  const startY = useRef(0)
  const [pulling, setPulling] = useState(false)

  const onTouchStart = (e) => { startY.current = e.touches[0].clientY }
  const onTouchMove = (e) => {
    const delta = e.touches[0].clientY - startY.current
    if (delta > 60) setPulling(true)
  }
  const onTouchEnd = () => {
    if (pulling) { onRefresh(); setPulling(false) }
    setPulling(false)
  }

  return { pulling, onTouchStart, onTouchMove, onTouchEnd }
}
