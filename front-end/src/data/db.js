// =====================================================================
// db.js: the ONLY file in Ticked that reads or changes data.
//
// The data now lives in a real Supabase (Postgres) database, in the
// tables from schema.sql:
//
//   projects   (id, name, description, user_id, created_at)
//   tasks      (id, title, is_complete, due_date, project_id, user_id, created_at)
//   tags       (id, name)
//   task_tags  (task_id, tag_id)   <- joins tasks and tags (many-to-many)
//
// Because the data is stored on a server, refreshing the browser no
// longer resets anything: what you create is still there next time.
//
// Every function is `async` and returns a Promise, because the database
// answers over the network. Each one is a call to Supabase's
// auto-generated REST API, for example:
//
//   listTasks()   ->  GET  /rest/v1/tasks?select=*,tags(id,name)
//   createTag()   ->  POST /rest/v1/tags
//   createTask()  ->  POST /rest/v1/rpc/create_task_with_tags
//
// The names, arguments and return shapes did not change when we swapped
// the old in-memory arrays for these calls, so the rest of the app
// (context, pages, components) didn't have to change at all.
//
// Logging in is done here too, with Supabase Auth (see ACCOUNTS below).
// Once someone is logged in, supabase-js sends their login token with
// every request, and the database's row level security does the rest:
//   * every list only contains the logged-in user's own rows
//     (tags are the exception: they are shared by everyone)
//   * new projects and tasks get user_id = the logged-in user
//     automatically (the column default is auth.uid()), so we never send it
// =====================================================================

import { createClient } from '@supabase/supabase-js'

// ---------- the connection ----------

// The client is made the first time we need it (not when the file loads),
// so a missing setting becomes an error the app can show in its banner
// instead of a blank page.
let client = null

function supabase() {
  if (client) return client

  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    )
  }

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

// Supabase Auth's error codes, in the app's own words. `field` says which
// form field the message belongs under (none = shown above the button).
const AUTH_MESSAGES = {
  invalid_credentials: { message: 'Wrong email or password' },
  user_already_exists: { message: 'An account with this email already exists', field: 'email' },
  email_exists: { message: 'An account with this email already exists', field: 'email' },
  weak_password: { message: 'Password must be at least 6 characters', field: 'password' },
}

function authError(error) {
  const known = AUTH_MESSAGES[error.code]
  const err = new Error(known ? known.message : error.message)
  err.field = known?.field
  return err
}

// The logged-in user's profile row from public.users: { id, name, email }.
// The row is made by the database itself when someone signs up.
async function getProfile(id) {
  return unwrap(await supabase().from('users').select('id, name, email').eq('id', id).single())
}

// Make a new account. Email confirmation is off for this project, so the
// new user is logged in straight away. `name` goes into the sign-up
// metadata, where the database's sign-up trigger picks it up.
// Returns the new user's profile.
export async function register({ name, email, password }) {
  const { data, error } = await supabase().auth.signUp({
    email: email,
    password: password,
    options: { data: { name: name } },
  })
  if (error) throw authError(error)
  return getProfile(data.user.id)
}

// Log in with email and password. Returns the user's profile.
export async function logIn({ email, password }) {
  const { data, error } = await supabase().auth.signInWithPassword({
    email: email,
    password: password,
  })
  if (error) throw authError(error)
  return getProfile(data.user.id)
}

// Who is logged in, after a refresh or a return visit. supabase-js keeps the
// login token in localStorage; we check it with Supabase (getUser asks the
// server, so a deleted account or a forged token doesn't count) and return
// that user's profile, or null if nobody is logged in.
export async function getCurrentUser() {
  const { data: saved } = await supabase().auth.getSession()
  if (!saved.session) return null

  const { data, error } = await supabase().auth.getUser()
  if (error) {
    // Supabase refused the token: forget it. (Any other error, like no
    // network, keeps it so the next visit can try again.)
    if (error.status === 401 || error.status === 403) {
      await supabase().auth.signOut({ scope: 'local' })
    }
    return null
  }
  return getProfile(data.user.id)
}

// Log out on this device. supabase-js deletes the saved login token from
// the browser (localStorage), so nothing that could log back in is left.
// scope 'local' leaves the user's other devices logged in.
export async function logOut() {
  unwrap(await supabase().auth.signOut({ scope: 'local' }))
}

// =====================================================================
// PROJECTS
// =====================================================================

// The logged-in user's projects, oldest first.
export async function listProjects() {
  return unwrap(
    await supabase()
      .from('projects')
      .select('id, name, description, user_id, created_at')
      .order('created_at', { ascending: true }),
  )
}

// Add a project (owned by the logged-in user). Returns the new row.
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
// (the database does this itself: ON DELETE SET NULL in schema.sql).
export async function deleteProject(id) {
  unwrap(await supabase().from('projects').delete().eq('id', id))
}

// =====================================================================
// TASKS
// =====================================================================

// The logged-in user's tasks, newest first. `tags(id, name)` asks Supabase to follow
// task_tags and bring each task's tags along as a `tags` array
// ([{ id, name }, ...]), sorted by name.
export async function listTasks() {
  return unwrap(
    await supabase()
      .from('tasks')
      .select('*, tags(id, name)')
      .order('created_at', { ascending: false })
      .order('name', { referencedTable: 'tags', ascending: true }),
  )
}

// Add a task (not complete yet) and link it to its tags. Returns the new row.
// A plain insert can't write two tables at once, so we call a database
// function (an RPC) that creates the task and its task_tags rows together:
// either everything is saved, or nothing is.
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

// Remove a task. Its task_tags rows go with it
// (the database does this itself: ON DELETE CASCADE in schema.sql).
export async function deleteTask(id) {
  unwrap(await supabase().from('tasks').delete().eq('id', id))
}

// =====================================================================
// TAGS
// =====================================================================

// All tags (shared by every user), A to Z (the tags table has no created_at to sort by).
export async function listTags() {
  return unwrap(
    await supabase().from('tags').select('id, name').order('name', { ascending: true }),
  )
}

// Add a tag. Returns the new row.
export async function createTag(name) {
  return unwrap(await supabase().from('tags').insert({ name: name }).select('id, name').single())
}

// =====================================================================
// DONATIONS
// =====================================================================

// Ask the `process-donation` Edge Function for a Stripe PaymentIntent.
// `amount` is whole cents (1 to 1,000,000). The function takes the user from
// the login, so no user id is sent. Returns the intent's `client_secret`,
// which Stripe.js uses to take the card payment in the browser.
// Throws an Error; `err.network` is true when the function couldn't be reached
// at all (as opposed to it answering with a rejection).
export async function createDonationIntent(amount) {
  const { data, error } = await supabase().functions.invoke('process-donation', {
    body: { amount: amount },
  })
  if (error) {
    const unreachable = error.name === 'FunctionsFetchError' || error.name === 'FunctionsRelayError'
    const err = new Error(
      unreachable ? 'Could not reach the donation service.' : 'The donation could not be started.',
    )
    err.network = unreachable
    throw err
  }
  if (!data?.client_secret) {
    throw new Error('The donation could not be started.')
  }
  return data.client_secret
}
