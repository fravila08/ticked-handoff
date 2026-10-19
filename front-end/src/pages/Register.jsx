import { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useTasks } from '../context/useTasks'
import FormField from '../components/FormField'
import { AlertIcon } from '../components/Icons'

const FIELDS = ['name', 'email', 'password']

// What's missing or wrong before we even ask Supabase.
function checkForm({ name, email, password }) {
  const errors = {}
  if (!name.trim()) errors.name = 'Give your name'
  if (!email.trim()) errors.email = 'Enter your email'
  if (!password) errors.password = 'Enter your password'
  else if (password.length < 6) errors.password = 'Password must be at least 6 characters'
  return errors
}

export default function Register() {
  const { register } = useAuth()
  const { showToast } = useTasks()
  const location = useLocation()
  const [values, setValues] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const nameRef = useRef(null)
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
    const refs = { name: nameRef, email: emailRef, password: passwordRef }
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
      const profile = await register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      })
      // AuthLayout sees the new user and moves on to the app.
      showToast(`Welcome, ${profile.name}`)
    } catch (err) {
      setSaving(false)
      if (err.field) showErrors({ [err.field]: err.message })
      else setFormError(err.message)
    }
  }

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">Create your account</h1>
        <p className="page-desc">Your tasks, projects and tags, kept just for you.</p>
      </header>

      <form className="form sheet" onSubmit={handleSubmit} noValidate aria-label="Create your account">
        <FormField
          id="register-name"
          label="Name"
          inputRef={nameRef}
          type="text"
          value={values.name}
          onChange={change('name')}
          autoComplete="name"
          maxLength={100}
          error={errors.name}
        />
        <FormField
          id="register-email"
          label="Email"
          inputRef={emailRef}
          type="email"
          value={values.email}
          onChange={change('email')}
          autoComplete="email"
          maxLength={255}
          error={errors.email}
        />
        <FormField
          id="register-password"
          label="Password"
          hint="(at least 6 characters)"
          inputRef={passwordRef}
          type="password"
          value={values.password}
          onChange={change('password')}
          autoComplete="new-password"
          error={errors.password}
        />

        {formError && (
          <p className="field-error" role="alert">
            <AlertIcon /> {formError}
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-wide btn-big" disabled={saving}>
          {saving ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account?{' '}
        <Link to="/login" state={location.state}>Log in</Link>
      </p>
    </>
  )
}
