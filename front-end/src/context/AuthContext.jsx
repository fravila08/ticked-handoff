import { useEffect, useState } from 'react'
import * as db from '../data/db'
import { AuthContext } from './useAuth'

// Who is logged in. Every account action goes through src/data/db.js.
//
//   session  the Supabase session (access + refresh token), or null
//   user     session.user: { id, email, ... } (id = auth.uid() in the database)
//   profile  their public.users row ({ id, name, email }) for the header
//   checking true until we know whether a saved session exists
//            (so a browser refresh doesn't flash the Log in page)
export function AuthProvider({ children }) {
  // Missing .env values? Show that message instead of a blank page.
  const [authError, setAuthError] = useState(db.configProblem)
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(!authError)
  const [profile, setProfile] = useState(null)

  // On start: recover the saved session (User Confirmation after a refresh),
  // then keep listening for log in, log out and token refreshes.
  useEffect(() => {
    if (db.configProblem()) return
    db.getSession()
      .then(setSession)
      .catch((err) => setAuthError(err.message))
      .finally(() => setChecking(false))
    return db.onAuthChange(setSession)
  }, [])

  const userId = session?.user?.id

  // Load the logged-in user's name whenever the user changes.
  useEffect(() => {
    if (!userId) return
    db.getProfile(userId)
      .then(setProfile)
      .catch(() => setProfile(null))
  }, [userId])

  const value = {
    session,
    user: session?.user ?? null,
    // Only show the name if it belongs to the person logged in now.
    profile: profile && profile.id === userId ? profile : null,
    checking,
    authError,
    signUp: db.signUp,
    signIn: db.signIn,
    signOut: db.signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
