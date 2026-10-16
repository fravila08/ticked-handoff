// Small inline SVG icons. They are decorative (aria-hidden):
// every button or link that uses one also has visible text or an aria-label.
const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
}

export function ListIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="4" width="5" height="5" rx="1.5" />
      <path d="M12 6.5h8.5" />
      <rect x="3.5" y="14" width="5" height="5" rx="1.5" />
      <path d="M12 16.5h8.5" />
    </svg>
  )
}

export function PlusIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function FolderIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 7.5a2 2 0 0 1 2-2h3.6l2 2.2h7.4a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
    </svg>
  )
}

export function TrashIcon(props) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <path d="M4.5 7h15M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12" />
      <path d="M10.2 11v5.5M13.8 11v5.5" />
    </svg>
  )
}

export function ChevronRightIcon(props) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <path d="M9.5 6l6 6-6 6" />
    </svg>
  )
}

export function ChevronLeftIcon(props) {
  return (
    <svg {...base} width={18} height={18} {...props}>
      <path d="M14.5 6l-6 6 6 6" />
    </svg>
  )
}

export function AlertIcon(props) {
  return (
    <svg {...base} width={16} height={16} strokeWidth={2.2} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5v.01" />
    </svg>
  )
}

export function CloseIcon(props) {
  return (
    <svg {...base} width={18} height={18} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

// The app mark: a ticked box
export function TickedMark(props) {
  return (
    <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true" focusable="false" {...props}>
      <rect x="3" y="3" width="26" height="26" rx="7" fill="var(--accent)" />
      <rect x="3" y="3" width="26" height="26" rx="7" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M9.5 16.5l4.5 4.5 8.5-10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
