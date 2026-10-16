import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import Loading from './Loading'

// Wraps every page that needs a logged-in user.
// Not logged in → go to /login, and remember where they were headed.
export default function RequireAuth() {
  const { user, checking } = useAuth()
  const location = useLocation()

  if (checking) return <Loading label="Checking who you are…" />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
