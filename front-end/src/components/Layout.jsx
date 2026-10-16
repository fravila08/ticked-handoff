import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TopBar from './TopBar'
import BottomNav from './BottomNav'
import ErrorBanner from './ErrorBanner'
import Toast from './Toast'

// Shared frame for every page: header, error banner, the page itself (<Outlet/>),
// a toast, and the tab bar.
export default function Layout() {
  const { pathname } = useLocation()

  // Start each new page at the top, like a normal website would
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to content</a>
      <TopBar />
      <main id="main" className="page">
        <ErrorBanner />
        <Outlet />
      </main>
      <Toast />
      <BottomNav />
    </div>
  )
}
