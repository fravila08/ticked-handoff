import { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useTasks } from '../context/useTasks'
import FormField from '../components/FormField'
import { AlertIcon } from '../components/Icons'

const FIELDS = ['email', 'password']

// What's missing before we even ask Supabase.
function checkForm({ email, password }) {
  const errors = {}
  if (!email.trim()) errors.email = 'Enter your email'
  if (!password) errors.password = 'Enter your password'
  return errors
}

export default function Login() {
  const { logIn } = useAuth()
  const { showToast } = useTasks()
  const location = useLocation()
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const emailRef = useRef(null)
  const passwordRef = useRef(null)

  // Typing in a field clears that field's message.
  function change(field) {
    return (e) => {
      setValues({ ...values, [field]: e.target.value })
      if (errors[field]) setErrors({ ...errors, [field]: '' })
    }
  }

  function showErrors(found) {
    setErrors(found)
    const refs = { email: emailRef, password: passwordRef }
    const first = FIELDS.find((field) => found[field])
    if (first) refs[first].current.focus()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    const found = checkForm(values)
    if (Object.keys(found).length) return showErrors(found)

    setSaving(true)
    try {
      const profile = await logIn({ email: values.email.trim(), password: values.password })
      // AuthLayout sees the user and moves on to the app.
      showToast(`Welcome, ${profile.name}`)
    } catch (err) {
      setSaving(false)
      // Wrong email or password: clear the password, keep the email.
      setValues({ ...values, password: '' })
      setFormError(err.message)
      passwordRef.current.focus()
    }
  }

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">Log in</h1>
        <p className="page-desc">Welcome back. Your list is waiting.</p>
      </header>

      <form className="form sheet" onSubmit={handleSubmit} noValidate aria-label="Log in">
        <FormField
          id="login-email"
          label="Email"
          inputRef={emailRef}
          type="email"
          value={values.email}
          onChange={change('email')}
          autoComplete="email"
          error={errors.email}
        />
        <FormField
          id="login-password"
          label="Password"
          inputRef={passwordRef}
          type="password"
          value={values.password}
          onChange={change('password')}
          autoComplete="current-password"
          error={errors.password}
        />

        {formError && (
          <p className="field-error" role="alert">
            <AlertIcon /> {formError}
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-wide btn-big" disabled={saving}>
          {saving ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="auth-switch">
        New to Ticked?{' '}
        <Link to="/register" state={location.state}>Create an account</Link>
      </p>
    </>
  )
}
