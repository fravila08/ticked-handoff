import { useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTasks } from '../context/useTasks'
import { AlertIcon, PlusIcon } from '../components/Icons'
import { tagColor } from '../utils/tagColor'

export default function NewTask() {
  const { projects, tags, addTask, addTag, showToast } = useTasks()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  // Form fields. ?project=<id> (from a project page) pre-picks that project.
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState(searchParams.get('project') || '')
  const [dueDate, setDueDate] = useState('')
  const [tagIds, setTagIds] = useState([])
  const [newTag, setNewTag] = useState('')
  const [titleError, setTitleError] = useState('')
  const [saving, setSaving] = useState(false)
  const titleRef = useRef(null)

  function toggleTag(id) {
    setTagIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }

  // "+ New tag": makes the tag (or finds the existing one) and selects it
  async function handleAddTag() {
    if (!newTag.trim()) return
    const tag = await addTag(newTag)
    if (!tag) return
    setTagIds((ids) => (ids.includes(tag.id) ? ids : [...ids, tag.id]))
    setNewTag('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) {
      setTitleError('Give your task a title')
      titleRef.current.focus()
      return
    }
    setSaving(true)
    const task = await addTask({
      title: title.trim(),
      project_id: projectId || null,
      due_date: dueDate || null,
      tagIds,
    })
    setSaving(false)
    if (!task) return // the error banner explains what went wrong
    showToast('Task added')
    navigate('/')
  }

  // Cancel goes back; if you landed here directly, go to Tasks
  function handleCancel() {
    if (location.key === 'default') navigate('/')
    else navigate(-1)
  }

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">New task</h1>
      </header>

      <form className="form sheet" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="title" className="label">Title</label>
          <input
            id="title"
            ref={titleRef}
            className="input"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (titleError && e.target.value.trim()) setTitleError('')
            }}
            placeholder="e.g. Finish lab report"
            autoFocus
            autoComplete="off"
            aria-invalid={titleError ? 'true' : 'false'}
            aria-describedby={titleError ? 'title-error' : undefined}
          />
          {titleError && (
            <p id="title-error" className="field-error">
              <AlertIcon /> {titleError}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="project" className="label">Project</label>
          <select id="project" className="select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="due" className="label">
            Due date <span className="label-hint">(optional)</span>
          </label>
          <input id="due" className="input input-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        <fieldset className="field">
          <legend className="label">Tags</legend>
          <div className="chip-row">
            {tags.map((tag) => {
              const on = tagIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={`chip tag-${tagColor(tag.name)}${on ? ' is-on' : ''}`}
                  aria-pressed={on}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </button>
              )
            })}
          </div>
          <div className="new-tag">
            <label htmlFor="new-tag" className="visually-hidden">New tag name</label>
            <input
              id="new-tag"
              className="input input-small"
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                // Enter here adds the tag instead of saving the whole form
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddTag()
                }
              }}
              placeholder="Tag name"
              maxLength={50}
              autoComplete="off"
            />
            <button type="button" className="btn btn-quiet btn-small" onClick={handleAddTag}>
              <PlusIcon width={18} height={18} /> New tag
            </button>
          </div>
        </fieldset>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-wide btn-big" disabled={saving}>
            {saving ? 'Saving…' : 'Save task'}
          </button>
          <button type="button" className="btn btn-quiet btn-wide" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </form>
    </>
  )
}
