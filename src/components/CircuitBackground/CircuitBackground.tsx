import { useEffect, useRef } from 'react'
import { useTheme } from '../../hooks/useTheme'
import { CircuitEngine } from './circuitEngine'

export function CircuitBackground() {
  const { theme } = useTheme()
  const themeRef = useRef(theme)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    themeRef.current = theme
  }, [theme])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !canvas.getContext('2d')) return

    const engine = new CircuitEngine(canvas, () => themeRef.current)
    engine.start()

    return () => engine.stop()
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 block h-full w-full"
    />
  )
}
