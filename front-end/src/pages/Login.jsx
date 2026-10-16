import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { AlertIcon } from '../components/Icons'

// Log In: a returning user gets back to their own tasks.
export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Enter your email and password')
      return
    }
    setBusy(true)
    setError('')
    try {
      await signIn({ email: email.trim(), password })
      // Back to the page they tried to open, or Tasks.
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      // Supabase says "Invalid login credentials" for a wrong email OR password,
      // on purpose: it never tells a stranger which emails have accounts.
      setError(err.message === 'Invalid login credentials' ? 'Wrong email or password' : err.message)
      setBusy(false)
    }
  }

  return (
    <form className="form sheet auth-card" onSubmit={handleSubmit} noValidate aria-labelledby="login-title">
      <h1 id="login-title" className="page-title">Log in</h1>

      {error && (
        <p className="field-error" role="alert">
          <AlertIcon /> {error}
        </p>
      )}

      <div className="field">
        <label htmlFor="login-email" className="label">Email</label>
        <input id="login-email" className="input" type="email" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="login-password" className="label">Password</label>
        <input id="login-password" className="input" type="password" autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>

      <button type="submit" className="btn btn-primary btn-wide btn-big" disabled={busy}>
        {busy ? 'Logging in…' : 'Log in'}
      </button>

      <p className="auth-switch">
        New to Ticked? <Link to="/register">Create an account</Link>
      </p>
    </form>
  )
}
