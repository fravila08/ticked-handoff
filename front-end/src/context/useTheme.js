import { createContext, useContext } from 'react'

// The context object lives in its own file so ThemeContext.jsx only exports
// a component (that keeps Vite's fast refresh working).
export const ThemeContext = createContext(null)

// Any component can call useTheme() to get { theme, toggleTheme }.
export function useTheme() {
  return useContext(ThemeContext)
}
