import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { AlertIcon } from '../components/Icons'

const MIN_PASSWORD = 6 // Supabase Auth's default minimum

// Register: a brand new user signs up and lands on their (empty) Tasks page.
export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Give us your name')
    if (!email.trim()) return setError('Enter your email')
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters for your password`)

    setBusy(true)
    setError('')
    try {
      const session = await signUp({ name: name.trim(), email: email.trim(), password })
      if (session) {
        navigate('/', { replace: true })
      } else {
        // The Supabase project still has "Confirm email" on: no session until they click the link.
        setNotice('Check your email for a confirmation link, then log in.')
        setBusy(false)
      }
    } catch (err) {
      setError(err.message === 'User already registered' ? 'That email already has an account. Log in instead.' : err.message)
      setBusy(false)
    }
  }

  return (
    <form className="form sheet auth-card" onSubmit={handleSubmit} noValidate aria-labelledby="register-title">
      <h1 id="register-title" className="page-title">Create your account</h1>

      {error && (
        <p className="field-error" role="alert">
          <AlertIcon /> {error}
        </p>
      )}
      {notice && <p className="auth-notice" role="status">{notice}</p>}

      <div className="field">
        <label htmlFor="register-name" className="label">Name</label>
        <input id="register-name" className="input" type="text" autoComplete="name" maxLength={100}
          value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="register-email" className="label">Email</label>
        <input id="register-email" className="input" type="email" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="register-password" className="label">
          Password <span className="label-hint">(at least {MIN_PASSWORD} characters)</span>
        </label>
        <input id="register-password" className="input" type="password" autoComplete="new-password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>

      <button type="submit" className="btn btn-primary btn-wide btn-big" disabled={busy}>
        {busy ? 'Creating account…' : 'Create account'}
      </button>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </form>
  )
}
