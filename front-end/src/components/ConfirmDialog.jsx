import { useEffect, useRef } from 'react'

// "Are you sure?" popup built on the native <dialog> element,
// which handles focus trapping and the Escape key for us.
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      aria-describedby={message ? 'dialog-text' : undefined}
      onCancel={(e) => {
        e.preventDefault() // Escape key -> treat as "Cancel"
        onCancel()
      }}
    >
      <h2 id="dialog-title" className="dialog-title">{title}</h2>
      {message && <p id="dialog-text" className="dialog-text">{message}</p>}
      <div className="dialog-actions">
        <button type="button" className="btn btn-quiet" onClick={onCancel} autoFocus>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
