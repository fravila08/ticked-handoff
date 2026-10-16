# Project Detail page: `/projects/:id`

**As a** user, **I want to** see one project's description and only its tasks, **so that** I can focus on one area at a time.

## On this page
- **< Back to Projects** link.
- Project name, description, and progress "2 of 5 done".
- That project's tasks, using the same task rows as the Tasks page (checkbox, due date, tags, trash).
- **+ Add task to this project** → `/tasks/new?project=<id>`.
- **Delete project** (secondary, red text) → "Delete this project? Its tasks stay, but lose their project." [Cancel] [Delete] → go to `/projects`, toast "Project deleted".
- Bottom nav: Tasks · New · Projects

## States
- **No tasks:** "No tasks in this project yet." + [Add task to this project].
- **Unknown id:** "That project doesn't exist" + link back to Projects.

## Done when
- [ ] Only this project's tasks are listed
- [ ] Ticking a task here updates the progress count right away
- [ ] Deleting the project keeps its tasks; they show "No project" on the Tasks page
