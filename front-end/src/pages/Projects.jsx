import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTasks } from '../context/useTasks'
import { projectProgress } from '../utils/tasks'
import Loading from '../components/Loading'
import ProgressBar from '../components/ProgressBar'
import { AlertIcon, ChevronRightIcon } from '../components/Icons'

export default function Projects() {
  const { projects, tasks, loading, addProject, showToast } = useTasks()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)
  const nameRef = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setNameError('Give your project a name')
      nameRef.current.focus()
      return
    }
    setSaving(true)
    const project = await addProject({ name: name.trim(), description: description.trim() })
    setSaving(false)
    if (!project) return // the error banner explains what went wrong
    setName('')
    setDescription('')
    showToast('Project created')
  }

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">Projects</h1>
      </header>

      {loading ? (
        <Loading label="Loading your projects…" />
      ) : projects.length === 0 ? (
        <div className="empty">
          <p className="empty-title">No projects yet. Create one to group your tasks.</p>
        </div>
      ) : (
        <ul className="project-list">
          {projects.map((project) => {
            const { done, total } = projectProgress(tasks, project.id)
            return (
              <li key={project.id}>
                <Link to={`/projects/${project.id}`} className="project-card">
                  <span className="project-card-text">
                    <span className="project-name">{project.name}</span>
                    {project.description && <span className="project-desc">{project.description}</span>}
                    <ProgressBar done={done} total={total} />
                  </span>
                  <ChevronRightIcon className="project-chevron" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <form className="form sheet" onSubmit={handleSubmit} noValidate aria-labelledby="new-project-title">
        <h2 id="new-project-title" className="section-title">New project</h2>

        <div className="field">
          <label htmlFor="project-name" className="label">Name</label>
          <input
            id="project-name"
            ref={nameRef}
            className="input"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (nameError && e.target.value.trim()) setNameError('')
            }}
            placeholder="e.g. Gym"
            autoComplete="off"
            maxLength={255}
            aria-invalid={nameError ? 'true' : 'false'}
            aria-describedby={nameError ? 'name-error' : undefined}
          />
          {nameError && (
            <p id="name-error" className="field-error">
              <AlertIcon /> {nameError}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="project-desc" className="label">
            Description <span className="label-hint">(optional)</span>
          </label>
          <input
            id="project-desc"
            className="input"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Workouts and stretching"
            autoComplete="off"
          />
        </div>

        <button type="submit" className="btn btn-primary btn-wide btn-big" disabled={saving}>
          {saving ? 'Creating…' : 'Create project'}
        </button>
      </form>
    </>
  )
}
