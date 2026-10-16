import { useState } from 'react'
import { useTasks } from '../context/useTasks'
import { sortTasks } from '../utils/tasks'
import ConfirmDialog from './ConfirmDialog'
import TaskRow from './TaskRow'

// The task rows used on both Tasks and Project Detail:
// open tasks first (soonest due first), then a "Done" group.
// It's one list on purpose, so a ticked row moves instead of being rebuilt
// (that keeps the checkmark animation and keyboard focus).
export default function TaskList({ tasks, showProject = true }) {
  const { removeTask } = useTasks()
  const [toDelete, setToDelete] = useState(null) // the task waiting for "Delete this task?"

  const { open, done } = sortTasks(tasks)

  // One flat array (not two .map() calls) so React can move a row
  // between the groups by its key instead of rebuilding it.
  const row = (task) => (
    <TaskRow key={task.id} task={task} showProject={showProject} onDelete={setToDelete} />
  )
  const rows = open.map(row)
  if (done.length > 0) {
    rows.push(
      <li className="group-label" key="done-label">
        <h2>Done</h2>
      </li>,
    )
  }
  rows.push(...done.map(row))

  async function confirmDelete() {
    const task = toDelete
    setToDelete(null)
    await removeTask(task.id)
  }

  return (
    <>
      <ul className="task-list">{rows}</ul>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this task?"
        message={toDelete ? `"${toDelete.title}" will be gone for good.` : null}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}
