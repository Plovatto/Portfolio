import { useTheme } from '../../hooks/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Mudar para tema ${isDark ? 'claro' : 'escuro'}`}
      className="fixed top-6 right-6 z-1 cursor-pointer rounded-full border border-border bg-surface px-5 py-2.5 text-sm text-text transition-colors duration-200 hover:border-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
    >
      {isDark ? 'Modo claro' : 'Modo escuro'}
    </button>
  )
}
