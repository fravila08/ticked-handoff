import { useEffect, useState } from 'react'
import { ThemeContext } from './useTheme'

// Light or dark look. Starts light; the choice is remembered in localStorage.
// index.html applies the saved theme before the first paint (no flash), this
// provider keeps <html data-theme>, the saved value and the browser's
// theme-color in step. localStorage can be blocked, so every access is guarded.

const KEY = 'ticked-theme'
const BAR_COLOR = { light: '#f4f5ef', dark: '#0f1a30' }

function readSaved() {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readSaved)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR_COLOR[theme])
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      // not saved: the choice still works for this visit
    }
  }, [theme])

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}
