import { useTheme } from '../context/useTheme'
import { MoonIcon, SunIcon } from './Icons'

// Switches between the light and dark look. Shows the icon of the mode you'd switch to.
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
