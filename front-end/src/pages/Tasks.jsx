import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTasks } from '../context/useTasks'
import Loading from '../components/Loading'
import TaskList from '../components/TaskList'
import { PlusIcon } from '../components/Icons'

const STATUSES = ['All', 'Open', 'Done']

export default function Tasks() {
  const { tasks, tags, loading } = useTasks()
  const [status, setStatus] = useState('All')
  const [tagId, setTagId] = useState('') // '' = all tags

  const openCount = tasks.filter((t) => !t.is_complete).length
  const doneCount = tasks.length - openCount

  // Apply the two filters
  const shown = tasks.filter((task) => {
    if (status === 'Open' && task.is_complete) return false
    if (status === 'Done' && !task.is_complete) return false
    if (tagId && !task.tags.some((tag) => tag.id === tagId)) return false
    return true
  })

  function clearFilters() {
    setStatus('All')
    setTagId('')
  }

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">Tasks</h1>
        {!loading && (
          <p className="page-count">
            <span>{openCount} open</span> · <span>{doneCount} done</span>
          </p>
        )}
      </header>

      {loading ? (
        <Loading />
      ) : tasks.length === 0 ? (
        <div className="empty">
          <p className="empty-title">Nothing to do yet. Add your first task.</p>
          <Link to="/tasks/new" className="btn btn-primary btn-wide">
            <PlusIcon /> Add task
          </Link>
        </div>
      ) : (
        <>
          <div className="filters">
            <fieldset className="segmented">
              <legend className="filter-label">Show</legend>
              <div className="segmented-options">
                {STATUSES.map((s) => (
                  <label key={s} className="segment">
                    <input
                      type="radio"
                      name="status"
                      value={s}
                      checked={status === s}
                      onChange={() => setStatus(s)}
                    />
                    <span>{s}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="field-inline">
              <label htmlFor="tag-filter" className="filter-label">Tag</label>
              <select id="tag-filter" className="select" value={tagId} onChange={(e) => setTagId(e.target.value)}>
                <option value="">All tags</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
            </div>
          </div>

          {shown.length === 0 ? (
            <div className="empty">
              <p className="empty-title">No tasks match this filter</p>
              <button type="button" className="btn btn-quiet" onClick={clearFilters}>Clear filters</button>
            </div>
          ) : (
            <TaskList tasks={shown} />
          )}

          <Link to="/tasks/new" className="btn btn-primary btn-wide btn-big">
            <PlusIcon /> New task
          </Link>
        </>
      )}
    </>
  )
}
