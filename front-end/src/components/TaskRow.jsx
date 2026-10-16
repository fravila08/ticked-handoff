import { useEffect, useRef } from 'react'
import { useTasks } from '../context/useTasks'
import { addedLabel, dueLabel } from '../utils/dates'
import { TrashIcon } from './Icons'
import TagChip from './TagChip'

// One task: [checkbox] title, then "project · due date · tags", then "Added 3 days ago".
export default function TaskRow({ task, showProject = true, onDelete }) {
  const { toggleTask, getProject, justAddedId } = useTasks()
  const checkboxRef = useRef(null)
  const refocus = useRef(false)

  // Ticking moves the row between the Open and Done groups, and moving a
  // focused element drops keyboard focus. Put it back once the row has moved.
  useEffect(() => {
    if (refocus.current) {
      refocus.current = false
      checkboxRef.current?.focus()
    }
  }, [task.is_complete])

  const project = task.project_id ? getProject(task.project_id) : null
  const due = dueLabel(task.due_date, task.is_complete)
  const titleId = `task-title-${task.id}`

  function handleToggle(e) {
    refocus.current = document.activeElement === e.target
    toggleTask(task.id, e.target.checked)
  }

  const classes = ['task']
  if (task.is_complete) classes.push('is-done')
  if (task.id === justAddedId) classes.push('is-new')

  return (
    <li className={classes.join(' ')}>
      <span className="check">
        <input
          ref={checkboxRef}
          type="checkbox"
          checked={task.is_complete}
          onChange={handleToggle}
          aria-labelledby={titleId}
        />
        <svg className="check-box" viewBox="0 0 28 28" aria-hidden="true">
          <rect className="check-fill" x="2" y="2" width="24" height="24" rx="7" />
          <rect className="check-edge" x="2" y="2" width="24" height="24" rx="7" />
          <path className="check-mark" d="M8 14.5l4 4 8-9" pathLength="1" />
        </svg>
      </span>

      <div className="task-body">
        <p className="task-title" id={titleId}>{task.title}</p>
        <p className="task-meta">
          {showProject && (
            <span className={project ? 'task-project' : 'task-project is-none'}>
              {project ? project.name : 'No project'}
            </span>
          )}
          {due && <span className={due.overdue ? 'task-due is-overdue' : 'task-due'}>{due.text}</span>}
          {task.tags.length > 0 && (
            <span className="task-tags">
              {task.tags.map((tag) => <TagChip key={tag.id} name={tag.name} />)}
            </span>
          )}
        </p>
        <p className="task-added">{addedLabel(task.created_at)}</p>
      </div>

      <button
        type="button"
        className="icon-btn task-delete"
        onClick={() => onDelete(task)}
        aria-label={`Delete "${task.title}"`}
      >
        <TrashIcon />
      </button>
    </li>
  )
}
