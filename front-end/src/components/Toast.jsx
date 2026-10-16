import { useEffect } from 'react'
import { useTasks } from '../context/useTasks'

// Small message that pops up above the tab bar and hides itself.
export default function Toast() {
  const { toast, hideToast } = useTasks()

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(hideToast, 2600)
    return () => clearTimeout(timer)
  }, [toast]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div className="toast" key={toast.id}>
          <svg className="toast-tick" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          {toast.message}
        </div>
      )}
    </div>
  )
}
