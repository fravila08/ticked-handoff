import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { TickedMark } from './Icons'
import Loading from './Loading'

// Frame for Log in and Register: just the brand and one card, no tab bar.
// Already logged in? Go straight to Tasks.
export default function AuthLayout() {
  const { user, checking, authError } = useAuth()

  if (!checking && user) return <Navigate to="/" replace />

  return (
    <div className="auth-screen">
      <main id="main" className="auth-main">
        <p className="auth-brand">
          <TickedMark />
          <span className="brand-name">Ticked</span>
        </p>
        {authError && (
          <p className="error-banner auth-config-error" role="alert">{authError}</p>
        )}
        {checking ? <Loading label="Checking who you are…" /> : <Outlet />}
      </main>
    </div>
  )
}
