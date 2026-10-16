// Turning dates into the friendly words the app shows.

const DAY = 24 * 60 * 60 * 1000

// Midnight today, so "days between" compares whole days
function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// 'YYYY-MM-DD' -> a Date at local midnight
// (new Date('2026-10-20') would read it as UTC and can land on the wrong day)
export function parseDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// How many whole days from today until this date (negative = in the past)
function daysFromToday(isoDate) {
  return Math.round((parseDate(isoDate) - startOfToday()) / DAY)
}

// "Due today", "Due tomorrow", "Due Fri", "Due Oct 20", or "Overdue"
export function dueLabel(dueDate, isComplete) {
  if (!dueDate) return null
  const days = daysFromToday(dueDate)
  const date = parseDate(dueDate)

  if (days < 0 && !isComplete) return { text: 'Overdue', overdue: true }
  if (days === 0) return { text: 'Due today', overdue: false }
  if (days === 1) return { text: 'Due tomorrow', overdue: false }
  if (days > 1 && days < 7) {
    return { text: `Due ${date.toLocaleDateString('en-US', { weekday: 'short' })}`, overdue: false }
  }
  return { text: `Due ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, overdue: false }
}

// "Added today", "Added yesterday", "Added 3 days ago"
export function addedLabel(createdAt) {
  const created = new Date(createdAt)
  created.setHours(0, 0, 0, 0)
  const days = Math.round((startOfToday() - created) / DAY)
  if (days <= 0) return 'Added today'
  if (days === 1) return 'Added yesterday'
  return `Added ${days} days ago`
}
