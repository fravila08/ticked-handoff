import { Link, useLocation } from 'react-router-dom'

// Round coffee-cup link pinned bottom-right on every logged-in page (hidden on /donate itself).
export default function DonateButton() {
  const { pathname } = useLocation()
  if (pathname === '/donate') return null

  return (
    <Link to="/donate" className="donate-fab" aria-label="Support Ticked: donate">
      <svg viewBox="0 0 32 32" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="M5 12h17v7a6 6 0 0 1-6 6h-5a6 6 0 0 1-6-6z" />
        <path d="M22 14h2.5a3 3 0 0 1 0 6H22" />
        <path className="donate-steam" d="M10 8c0-1.5 1.5-1.5 1.5-3M16 8c0-1.5 1.5-1.5 1.5-3" />
        <path d="M4 28h19" />
      </svg>
    </Link>
  )
}
