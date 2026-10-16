// Shown while the data is loading (a blink with in-memory data,
// longer once it comes from Supabase).
export default function Loading({ label = 'Loading your tasks…' }) {
  return (
    <p className="loading" role="status">
      {label}
    </p>
  )
}
