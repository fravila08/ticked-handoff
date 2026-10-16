import { createContext, useContext } from 'react'

// The context object lives in its own file so TaskContext.jsx only exports
// a component (that keeps Vite's fast refresh working).
export const TaskContext = createContext(null)

// Any component can call useTasks() to read or change the data.
export function useTasks() {
  return useContext(TaskContext)
}
