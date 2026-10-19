import { AlertIcon } from './Icons'

// One labelled input with its inline error underneath (used by the
// Register and Log in forms). Any other props go straight to the <input>.
export default function FormField({ id, label, hint, error, inputRef, ...inputProps }) {
  return (
    <div className="field">
      <label htmlFor={id} className="label">
        {label} {hint && <span className="label-hint">{hint}</span>}
      </label>
      <input
        id={id}
        ref={inputRef}
        className="input"
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
        {...inputProps}
      />
      {error && (
        <p id={`${id}-error`} className="field-error">
          <AlertIcon /> {error}
        </p>
      )}
    </div>
  )
}
