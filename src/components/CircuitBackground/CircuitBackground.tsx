import { useEffect, useRef } from 'react'
import { useTheme } from '../../hooks/useTheme'
import { CircuitEngine } from './circuitEngine'

interface CircuitBackgroundProps {
  label?: string
  active?: boolean
}

export function CircuitBackground({ label = '', active = true }: CircuitBackgroundProps) {
  const { theme } = useTheme()
  const themeRef = useRef(theme)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    themeRef.current = theme
  }, [theme])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!active || !canvas || !canvas.getContext('2d')) return

    const engine = new CircuitEngine(canvas, () => themeRef.current, label)
    engine.start()

    return () => engine.stop()
  }, [label, active])

  return <canvas ref={canvasRef} aria-hidden="true" className="circuit-canvas" />
}
