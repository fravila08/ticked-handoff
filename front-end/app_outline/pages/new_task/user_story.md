# New Task page: `/tasks/new`

**As a** user, **I want to** add a task with a title, project, due date and tags, **so that** I can capture it in a few seconds.

## On this page
- **Title** (required) text input, focused when the page opens.
- **Project** dropdown: "No project" (default), then every project. If the URL has `?project=<id>` (from Project Detail), that project is already picked.
- **Due date** (optional) date input.
- **Tags:** every existing tag as a toggle chip (tap to add or remove). A small "+ New tag" input adds a tag and selects it. A task can have several tags.
- **Save task** (primary) and **Cancel** (goes back).
- Bottom nav: Tasks · New · Projects

## Rules & errors
- Empty title (or only spaces) → inline red message under the title: "Give your task a title". The field gets an error border; nothing else is cleared.
- A new tag that already exists (any capitals, e.g. "Urgent") selects the existing tag instead of making a copy.
- Save → task is created (not complete, `created_at` = now) → go to `/` with toast "Task added".

## Done when
- [ ] Can add "Finish lab report" in School, due Friday, tagged school + urgent, and see it on Tasks
- [ ] Empty title shows the inline error and nothing is saved
- [ ] Coming from a project page pre-picks that project
