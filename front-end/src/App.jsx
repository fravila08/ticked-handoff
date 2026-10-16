import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import AuthLayout from './components/AuthLayout'
import RequireAuth from './components/RequireAuth'
import Login from './pages/Login'
import Register from './pages/Register'
import Tasks from './pages/Tasks'
import NewTask from './pages/NewTask'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      {/* Open to everyone: Log in and Register (logged-in users are sent to Tasks) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Everything else needs a logged-in user */}
      <Route element={<RequireAuth />}>
        {/* Layout renders the header, bottom nav + <Outlet/> for the current page */}
        <Route element={<Layout />}>
          <Route path="/" element={<Tasks />} />
          <Route path="/tasks/new" element={<NewTask />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  )
}
