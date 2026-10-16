// "2 of 5 done" with a thin bar underneath it.
export default function ProgressBar({ done, total }) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="progress">
      <span className="progress-label">{done} of {total} done</span>
      <span className="progress-track" aria-hidden="true">
        <span className="progress-fill" style={{ transform: `scaleX(${percent / 100})` }} />
      </span>
    </div>
  )
}
