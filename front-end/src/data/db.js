// =====================================================================
// db.js: the ONLY file in Ticked that talks to Supabase.
//
// Two jobs:
//   1. ACCOUNTS (Supabase Auth): register, log in, log out, and "who is
//      logged in right now?"
//   2. DATA (Supabase's auto-generated REST API), in the tables from
//      supabase/schema.sql:
//
//   users      (id, name, email, created_at)    <- mirrors auth.users
//   projects   (id, name, description, user_id, created_at)
//   tasks      (id, title, is_complete, due_date, project_id, user_id, created_at)
//   tags       (id, name)                        <- shared by everyone
//   task_tags  (task_id, tag_id)
//
// How the database knows who is asking:
//   After log in, supabase-js keeps the user's ACCESS TOKEN (a JWT) and
//   sends it on every request:  Authorization: Bearer <access token>
//   Supabase checks the token and hands the user's id to Postgres as
//   auth.uid(). The RLS policies (auth.uid() = user_id) then return only
//   this user's rows. That's why nothing below sends a user id: new rows
//   get user_id = auth.uid() from the database itself.
//
// The data functions kept the names and return shapes they had before
// logins existed, so the pages didn't change.
// =====================================================================

import { createClient } from '@supabase/supabase-js'

// ---------- the connection ----------

// The client is made the first time we need it (not when the file loads),
// so a missing setting becomes a message the app can show
// instead of a blank page.
let client = null

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// The message to show if the settings are missing, or null if they're there.
export function configProblem() {
  if (url && key) return null
  return 'Supabase is not configured. Copy .env.example to .env in front-end/ and fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then restart npm run dev.'
}

function supabase() {
  if (client) return client
  if (configProblem()) throw new Error(configProblem())

  // By default supabase-js saves the session (access + refresh token) in
  // localStorage and refreshes the access token before it expires.
  client = createClient(url, key)
  return client
}

// Supabase reports problems as `{ error }` instead of throwing.
// We turn that into a normal Error, and hand back the data otherwise.
function unwrap({ data, error }) {
  if (error) throw new Error(error.message)
  return data
}

// =====================================================================
// ACCOUNTS
// =====================================================================

// Register. `name` travels as user metadata; the database trigger
// (handle_new_user) copies it into public.users.
// Returns the new session (null if the project still asks for email confirmation).
export async function signUp({ name, email, password }) {
  const data = unwrap(
    await supabase().auth.signUp({ email, password, options: { data: { name } } }),
  )
  return data.session
}

// Log in with email + password. Returns the session.
export async function signIn({ email, password }) {
  const data = unwrap(await supabase().auth.signInWithPassword({ email, password }))
  return data.session
}

// Log out: Supabase revokes the refresh token and supabase-js removes the
// saved session from the browser.
export async function signOut() {
  unwrap(await supabase().auth.signOut())
}

// The saved session, if any (used after a browser refresh).
export async function getSession() {
  const data = unwrap(await supabase().auth.getSession())
  return data.session
}

// Call `callback(session)` whenever someone logs in or out, or the token
// is refreshed. Returns a function that stops listening.
export function onAuthChange(callback) {
  const { data } = supabase().auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}

// The logged-in user's row in public.users (their name for the header).
export async function getProfile(id) {
  return unwrap(
    await supabase().from('users').select('id, name, email').eq('id', id).maybeSingle(),
  )
}

// =====================================================================
// PROJECTS (RLS: only yours)
// =====================================================================

// Your projects, oldest first.
export async function listProjects() {
  return unwrap(
    await supabase()
      .from('projects')
      .select('id, name, description, user_id, created_at')
      .order('created_at', { ascending: true }),
  )
}

// Add a project. user_id is filled in by the database (auth.uid()).
export async function createProject({ name, description }) {
  return unwrap(
    await supabase()
      .from('projects')
      .insert({ name: name, description: description || null })
      .select()
      .single(),
  )
}

// Remove a project. Its tasks stay, but lose their project
// (ON DELETE SET NULL in schema.sql).
export async function deleteProject(id) {
  unwrap(await supabase().from('projects').delete().eq('id', id))
}

// =====================================================================
// TASKS (RLS: only yours)
// =====================================================================

// Your tasks, newest first, each with its tags as a `tags` array.
export async function listTasks() {
  return unwrap(
    await supabase()
      .from('tasks')
      .select('*, tags(id, name)')
      .order('created_at', { ascending: false })
      .order('name', { referencedTable: 'tags', ascending: true }),
  )
}

// Add a task and link its tags in one go (a database function, so either
// everything is saved or nothing is). The owner comes from the token.
export async function createTask({ title, project_id, due_date, tagIds }) {
  return unwrap(
    await supabase().rpc('create_task_with_tags', {
      p_title: title,
      p_project_id: project_id || null,
      p_due_date: due_date || null,
      p_tag_ids: tagIds || [],
    }),
  )
}

// Tick a task off (true) or re-open it (false).
export async function setTaskComplete(id, is_complete) {
  unwrap(await supabase().from('tasks').update({ is_complete: is_complete }).eq('id', id))
}

// Remove a task. Its task_tags rows go with it (ON DELETE CASCADE).
export async function deleteTask(id) {
  unwrap(await supabase().from('tasks').delete().eq('id', id))
}

// =====================================================================
// TAGS (shared by every logged-in user)
// =====================================================================

// All tags, A to Z.
export async function listTags() {
  return unwrap(
    await supabase().from('tags').select('id, name').order('name', { ascending: true }),
  )
}

// Add a tag. Returns the new row.
export async function createTag(name) {
  return unwrap(await supabase().from('tags').insert({ name: name }).select('id, name').single())
}
