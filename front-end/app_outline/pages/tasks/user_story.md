# Tasks page: `/`

**As a** user, **I want to** see all my tasks with their project, due date and tags, and tick them off, **so that** I always know what's left to do.

## On this page
- Title "Tasks" and a count: "4 open · 2 done".
- Filters: status (All · Open · Done) and a tag dropdown (All tags · school · urgent · …).
- Task rows, open tasks first (soonest due date first, no due date last), then done tasks:
  - Checkbox: ticks the task complete / re-opens it.
  - Title.
  - Small line: project name · due date ("Due tomorrow", "Due Oct 20", red "Overdue" if past) · tag chips.
  - Small grey "Added 3 days ago" (from `created_at`).
  - Trash icon → "Delete this task?" [Cancel] [Delete].
- **+ New task** (primary) → `/tasks/new`
- Bottom nav: Tasks · New · Projects

## States
- **Empty:** no tasks at all → "Nothing to do yet. Add your first task." + [Add task].
- **Filtered empty:** → "No tasks match this filter" + [Clear filters].

## Done when
- [ ] Ticking a checkbox moves the task to Done (and back) without a page reload
- [ ] Filtering by `urgent` shows only urgent tasks
- [ ] Deleting asks first, then removes the task
- [ ] Refreshing the page brings back the seed tasks (no database yet)
