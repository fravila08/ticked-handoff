import { createContext, useContext } from 'react'

// Like useTasks.js: the context object lives in its own file so
// AuthContext.jsx only exports a component (keeps Vite's fast refresh working).
export const AuthContext = createContext(null)

// Any component can call useAuth() to see who is logged in, or to log in and out.
export function useAuth() {
  return useContext(AuthContext)
}
