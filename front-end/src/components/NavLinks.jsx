import { NavLink } from 'react-router-dom'
import { FolderIcon, ListIcon, PlusIcon } from './Icons'

// The three main pages. NavLink adds class="active" (and aria-current="page")
// to the link for the page you're on.
export default function NavLinks() {
  return (
    <>
      <NavLink to="/" end className="tab">
        <ListIcon />
        <span>Tasks</span>
      </NavLink>
      <NavLink to="/tasks/new" className="tab">
        <PlusIcon />
        <span>New</span>
      </NavLink>
      <NavLink to="/projects" className="tab">
        <FolderIcon />
        <span>Projects</span>
      </NavLink>
    </>
  )
}
