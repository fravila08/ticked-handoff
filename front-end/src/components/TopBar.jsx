import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { TickedMark } from './Icons'
import NavLinks from './NavLinks'

// App name at the top, then who is logged in and Log out.
// On wide screens the nav links move up here too.
export default function TopBar() {
  const { user, profile, signOut } = useAuth()

  return (
    <header className="topbar">
      <Link to="/" className="brand" aria-label="Ticked, go to Tasks">
        <TickedMark />
        <span className="brand-name">Ticked</span>
      </Link>
      <nav className="topnav" aria-label="Main">
        <NavLinks />
      </nav>
      {user && (
        <div className="account">
          {/* User Confirmation: always show who the app thinks you are */}
          <span className="account-name" title={user.email}>{profile?.name || user.email}</span>
          <button type="button" className="btn btn-quiet btn-small" onClick={() => signOut()}>
            Log out
          </button>
        </div>
      )}
    </header>
  )
}
