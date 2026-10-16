import NavLinks from './NavLinks'

// Tab bar fixed to the bottom of the screen on phones (hidden on wide screens,
// where the same links sit in the top bar).
export default function BottomNav() {
  return (
    <nav className="tabbar" aria-label="Main">
      <NavLinks />
    </nav>
  )
}
