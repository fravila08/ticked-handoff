import { useEffect, useState } from 'react'
import * as db from '../data/db'
import { AuthContext } from './useAuth'

// Who is logged in. Like TaskContext, it never talks to Supabase itself:
// every account action goes through src/data/db.js.
// `user` is the logged-in user's profile ({ id, name, email }), or null.
// `checking` is true while we find out who's logged in when the app starts.
// (Components read it with the useAuth() hook from ./useAuth.js)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  // When the app starts (or the page is refreshed), pick up the login
  // saved in the browser, so the user stays logged in.
  useEffect(() => {
    db.getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecking(false))
  }, [])

  // Make an account and log straight in. Throws (with err.field set when
  // the message belongs to one form field) so the form can show it.
  async function register({ name, email, password }) {
    const profile = await db.register({ name, email, password })
    setUser(profile)
    return profile
  }

  // Log in to an existing account. Throws "Wrong email or password" etc.
  async function logIn({ email, password }) {
    const profile = await db.logIn({ email, password })
    setUser(profile)
    return profile
  }

  // Log out. Once the saved token is gone, RequireAuth sends the browser to
  // Log in and TaskContext clears the old user's lists. If Supabase can't be
  // reached the token stays, so this throws and the user stays logged in.
  async function logOut() {
    await db.logOut()
    setUser(null)
  }

  const value = { user, checking, register, logIn, logOut }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
