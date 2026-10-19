import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import Loading from './Loading'
import TopBar from './TopBar'
import Toast from './Toast'

// Frame for the logged-out pages (Register, Log in): the app name, the form,
// no tab bar. As soon as someone is logged in, it sends them on to the page
// they were trying to open (or Tasks).
export default function AuthLayout() {
  const { user, checking } = useAuth()
  const location = useLocation()

  // Still reading the saved login: don't flash the form at someone who's logged in.
  if (checking) {
    return (
      <main className="page">
        <Loading label="Checking who's logged in…" />
      </main>
    )
  }
  if (user) return <Navigate to={location.state?.from ?? '/'} replace />

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to content</a>
      <TopBar />
      <main id="main" className="page page-auth">
        <Outlet />
      </main>
      <Toast />
    </div>
  )
}
