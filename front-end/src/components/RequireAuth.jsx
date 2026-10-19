import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import Loading from './Loading'

// Wraps every page that needs a logged-in user. Anyone else is sent to
// Log in, which remembers where they were going (state.from) and sends
// them back there once they're in.
export default function RequireAuth() {
  const { user, checking } = useAuth()
  const location = useLocation()

  // Still reading the saved login (just after a refresh): wait, don't bounce.
  if (checking) {
    return (
      <main className="page">
        <Loading label="Checking who's logged in…" />
      </main>
    )
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}
