import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useTasks } from '../context/useTasks'
import { TickedMark } from './Icons'
import NavLinks from './NavLinks'
import ThemeToggle from './ThemeToggle'

// App name at the top. On wide screens the nav links move up here too.
// Once someone is logged in it also shows who that is and a Log out button
// (the Register / Log in pages have neither).
export default function TopBar() {
  const { user, logOut } = useAuth()
  const { showToast } = useTasks()

  async function handleLogOut() {
    try {
      await logOut()
      showToast('Signed out')
    } catch {
      showToast('Could not log out. Try again.')
    }
  }

  return (
    <header className="topbar">
      <Link to="/" className="brand" aria-label="Ticked, go to Tasks">
        <TickedMark />
        <span className="brand-name">Ticked</span>
      </Link>
      {user && (
        <nav className="topnav" aria-label="Main">
          <NavLinks />
        </nav>
      )}
      <div className="account">
        {user && (
          <>
            <p className="account-name" title={user.email}>
              <span className="visually-hidden">Logged in as </span>
              {user.name}
            </p>
            <button type="button" className="btn btn-small btn-quiet" onClick={handleLogOut}>
              Log out
            </button>
          </>
        )}
        <ThemeToggle />
      </div>
    </header>
  )
}
