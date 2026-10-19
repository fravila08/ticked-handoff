import { useEffect, useState } from 'react'
import * as db from '../data/db'
import { TaskContext } from './useTasks'
import { useAuth } from './useAuth'

// The context holds a copy of the logged-in user's data for the pages to show.
// It never touches the data directly: every read and write goes
// through src/data/db.js, then we re-load so the screen matches.
// (Components read it with the useTasks() hook from ./useTasks.js)

// Ask db.js for all three lists at once.
function loadEverything() {
  return Promise.all([db.listProjects(), db.listTasks(), db.listTags()])
}

export function TaskProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const [justAddedId, setJustAddedId] = useState(null) // the row that slides in

  // Put freshly loaded rows on screen (or the error, if loading failed).
  function showData([projectRows, taskRows, tagRows]) {
    setProjects(projectRows)
    setTasks(taskRows)
    setTags(tagRows)
    setError(null)
    setLoading(false)
  }

  function showLoadError(err) {
    setError(err.message || 'Could not load your tasks.')
    setLoading(false)
  }

  // Load (or re-load) everything from the data layer.
  function refresh() {
    return loadEverything().then(showData).catch(showLoadError)
  }

  // A different user (or nobody) is logged in: clear the old lists straight
  // away, so one user's tasks never flash up for the next (or after logging out).
  const [listsFor, setListsFor] = useState(userId)
  if (listsFor !== userId) {
    setListsFor(userId)
    setProjects([])
    setTasks([])
    setTags([])
    setError(null)
    setLoading(true)
  }

  // ...then load the new user's data.
  useEffect(() => {
    if (!userId) return
    let stale = false // a slow answer for the previous user is thrown away
    loadEverything()
      .then((rows) => !stale && showData(rows))
      .catch((err) => !stale && showLoadError(err))
    return () => {
      stale = true
    }
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

