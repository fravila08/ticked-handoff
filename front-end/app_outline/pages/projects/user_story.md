# Projects page: `/projects`

**As a** user, **I want to** see my projects and create new ones, **so that** I can group related tasks together.

## On this page
- Title "Projects".
- One card per project: name, description, progress "2 of 5 done" with a small progress bar. Tapping a card → `/projects/:id`.
- **New project** form at the top or bottom: Name (required), Description (optional), [Create project].
- Bottom nav: Tasks · New · Projects

## Rules & errors
- Empty name → inline red message "Give your project a name"; nothing else is cleared.
- Create → the new card appears with "0 of 0 done", form clears, toast "Project created".

## States
- **Empty:** no projects → "No projects yet. Create one to group your tasks."

## Done when
- [ ] Creating "Gym" with a description shows a new card
- [ ] Progress counts match the tasks in each project
- [ ] Tapping a card opens that project's page
