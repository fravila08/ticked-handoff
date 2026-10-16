// Small helpers for ordering and counting tasks.

// Open tasks first (soonest due date first, no due date last), then done tasks.
// Ties keep the order they came in (newest first).
export function sortTasks(tasks) {
  const byDue = (a, b) => {
    if (a.due_date === b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date.localeCompare(b.due_date)
  }
  const open = tasks.filter((t) => !t.is_complete).sort(byDue)
  const done = tasks.filter((t) => t.is_complete).sort(byDue)
  return { open, done }
}

// { done: 2, total: 5 } for one project
export function projectProgress(tasks, projectId) {
  const mine = tasks.filter((t) => t.project_id === projectId)
  return { done: mine.filter((t) => t.is_complete).length, total: mine.length }
}
