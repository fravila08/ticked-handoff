import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTasks } from '../context/useTasks'
import { projectProgress } from '../utils/tasks'
import ConfirmDialog from '../components/ConfirmDialog'
import Loading from '../components/Loading'
import ProgressBar from '../components/ProgressBar'
import TaskList from '../components/TaskList'
import { ChevronLeftIcon, PlusIcon } from '../components/Icons'

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tasks, loading, getProject, removeProject, showToast } = useTasks()
  const [confirming, setConfirming] = useState(false)

  const project = getProject(id)

  const backLink = (
    <Link to="/projects" className="back-link">
      <ChevronLeftIcon /> Back to Projects
    </Link>
  )

  if (loading) {
    return (
      <>
        {backLink}
        <Loading label="Loading this project…" />
      </>
    )
  }

  if (!project) {
    return (
      <div className="empty empty-page">
        <h1 className="empty-title">That project doesn't exist</h1>
        <p className="empty-text">It may have been deleted.</p>
        <Link to="/projects" className="btn btn-primary">Back to Projects</Link>
      </div>
    )
  }

  const projectTasks = tasks.filter((t) => t.project_id === project.id)
  const { done, total } = projectProgress(tasks, project.id)

  async function handleDelete() {
    setConfirming(false)
    // Leave first, so this page doesn't flash "That project doesn't exist"
    navigate('/projects')
    const ok = await removeProject(project.id)
    if (ok) showToast('Project deleted')
  }

  return (
    <>
      {backLink}

      <header className="page-head project-head">
        <h1 className="page-title">{project.name}</h1>
        {project.description && <p className="page-desc">{project.description}</p>}
        <ProgressBar done={done} total={total} />
      </header>

      {projectTasks.length === 0 ? (
        <div className="empty">
          <p className="empty-title">No tasks in this project yet.</p>
        </div>
      ) : (
        <TaskList tasks={projectTasks} showProject={false} />
      )}

      <Link to={`/tasks/new?project=${project.id}`} className="btn btn-primary btn-wide btn-big">
        <PlusIcon /> Add task to this project
      </Link>

      <button type="button" className="btn btn-danger-text btn-wide" onClick={() => setConfirming(true)}>
        Delete project
      </button>

      <ConfirmDialog
        open={confirming}
        title="Delete this project?"
        message="Its tasks stay, but lose their project."
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  )
}
