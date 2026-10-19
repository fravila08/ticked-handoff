import { createContext, useContext } from 'react'

// The context object lives in its own file so AuthContext.jsx only exports
// a component (that keeps Vite's fast refresh working).
export const AuthContext = createContext(null)

// Any component can call useAuth() to see who is logged in.
export function useAuth() {
  return useContext(AuthContext)
}
