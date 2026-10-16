import { useEffect, useState } from 'react'
import * as db from '../data/db'
import { useAuth } from './useAuth'
import { TaskContext } from './useTasks'

// The context holds a copy of the data for the pages to show.
// It never touches the data directly: every read and write goes
// through src/data/db.js, then we re-load so the screen matches.
// (Components read it with the useTasks() hook from ./useTasks.js)
//
// Each user sees only their own projects and tasks (RLS in the database),
// so we load when someone logs in and empty everything when they log out.

// Ask db.js for all three lists at once.
function loadEverything() {
  return Promise.all([db.listProjects(), db.listTasks(), db.listTags()])
}

export function TaskProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id
  // The loaded rows, labelled with whose they are. If that's not the person
  // logged in now (they just logged out, or someone else logged in), the
  // pages get empty lists and "loading" instead of the old rows.
  const [data, setData] = useState({ owner: null, projects: [], tasks: [], tags: [] })
  const [loadFailed, setLoadFailed] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const [justAddedId, setJustAddedId] = useState(null) // the row that slides in

  const isMine = Boolean(userId) && data.owner === userId
  const projects = isMine ? data.projects : []
  const tasks = isMine ? data.tasks : []
  const tags = isMine ? data.tags : []
  const loading = !isMine && !loadFailed

  // Load (or re-load) everything from the data layer and put it on screen
  // (or the error, if loading failed).
  function load(owner) {
    return loadEverything()
      .then(([projectRows, taskRows, tagRows]) => {
        setData({ owner, projects: projectRows, tasks: taskRows, tags: tagRows })
        setLoadFailed(false)
        setError(null)
      })
      .catch((err) => {
        setLoadFailed(true)
        setError(err.message || 'Could not load your tasks.')
      })
  }

  const refresh = () => load(userId)

  // Load when a user logs in (or a saved session is recovered after a refresh).
  useEffect(() => {
    if (userId) load(userId)
  }, [userId])

  // Run a change through db.js, then re-load. Returns the change's result,
  // or null if it failed (the error banner shows the message).
  async function runChange(change, failMessage) {
    try {
      const result = await change()
      await refresh()
      return result ?? true
    } catch (err) {
      setError(err.message || failMessage)
      return null
    }
  }

  // ----- tasks -----
  async function addTask({ title, project_id, due_date, tagIds }) {
    const task = await runChange(
      () => db.createTask({ title, project_id, due_date, tagIds }),
      'Could not save the task.',
    )
    if (task) {
      // Mark it for the slide-in animation, then forget it so it doesn't replay later.
      setJustAddedId(task.id)
      setTimeout(() => setJustAddedId(null), 1500)
    }
    return task
  }

  const toggleTask = (id, is_complete) =>
    runChange(() => db.setTaskComplete(id, is_complete), 'Could not update the task.')

  const removeTask = (id) => runChange(() => db.deleteTask(id), 'Could not delete the task.')

  // ----- projects -----
  const addProject = ({ name, description }) =>
    runChange(() => db.createProject({ name, description }), 'Could not create the project.')

  const removeProject = (id) => runChange(() => db.deleteProject(id), 'Could not delete the project.')

  // ----- tags -----
  // If a tag with the same name exists (any capitals), reuse it instead of making a copy.
  async function addTag(name) {
    const clean = name.trim().toLowerCase()
    const existing = tags.find((t) => t.name.toLowerCase() === clean)
    if (existing) return existing
    return runChange(() => db.createTag(clean), 'Could not add the tag.')
  }

  // ----- lookups -----
  const getProject = (id) => projects.find((p) => p.id === id)

  // ----- toast messages ("Task added") -----
  const showToast = (message) => setToast({ id: Date.now(), message })
  const hideToast = () => setToast(null)

  const value = {
    projects,
    tasks,
    tags,
    loading,
    error,
    clearError: () => setError(null),
    refresh,
    addTask,
    toggleTask,
    removeTask,
    addProject,
    removeProject,
    addTag,
    getProject,
    justAddedId,
    toast,
    showToast,
    hideToast,
  }

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>
}

