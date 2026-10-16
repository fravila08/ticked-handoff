import { useTasks } from '../context/useTasks'
import { AlertIcon, CloseIcon } from './Icons'

// Shown when db.js throws (e.g. the database can't be reached).
// With in-memory data this never happens; with Supabase it can.
export default function ErrorBanner() {
  const { error, clearError, refresh } = useTasks()
  if (!error) return null

  return (
    <div className="error-banner" role="alert">
      <AlertIcon />
      <p className="error-banner-text">
        <strong>Something went wrong.</strong> {error}
      </p>
      <button type="button" className="btn-link" onClick={refresh}>Try again</button>
      <button type="button" className="icon-btn" onClick={clearError} aria-label="Dismiss error">
        <CloseIcon />
      </button>
    </div>
  )
}
