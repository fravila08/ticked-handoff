import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { TaskProvider } from './context/TaskContext'
import App from './App'
import './index.css'

// GitHub Pages has no SPA fallback: the site's 404.html sends deep links here as ?p=/projects
const redirected = new URLSearchParams(location.search).get('p')
if (redirected) history.replaceState(null, '', import.meta.env.BASE_URL.replace(/\/$/, '') + redirected)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <TaskProvider>
          <App />
        </TaskProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
