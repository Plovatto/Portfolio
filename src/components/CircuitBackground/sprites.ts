const SIZE = 64

export class GlowSprites {
  private readonly cache = new Map<string, HTMLCanvasElement>()

  draw(
    ctx: CanvasRenderingContext2D,
    hue: number,
    light: number,
    x: number,
    y: number,
    radius: number,
    alpha: number,
  ) {
    if (alpha <= 0.01) return
    ctx.globalAlpha = Math.min(1, alpha)
    ctx.drawImage(this.get(hue, light), x - radius, y - radius, radius * 2, radius * 2)
    ctx.globalAlpha = 1
  }

  private get(hue: number, light: number): HTMLCanvasElement {
    const h = Math.round(hue / 8) * 8
    const key = `${h}-${light}`
    let sprite = this.cache.get(key)
    if (sprite) return sprite

    sprite = document.createElement('canvas')
    sprite.width = SIZE
    sprite.height = SIZE
    const ctx = sprite.getContext('2d')!
    const r = SIZE / 2
    const g = ctx.createRadialGradient(r, r, 0, r, r, r)
    g.addColorStop(0, `hsla(${h}, 100%, ${Math.min(94, light + 22)}%, 1)`)
    g.addColorStop(0.22, `hsla(${h}, 100%, ${light}%, 0.55)`)
    g.addColorStop(1, `hsla(${h}, 100%, ${light}%, 0)`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, SIZE, SIZE)
    this.cache.set(key, sprite)
    return sprite
  }
}
