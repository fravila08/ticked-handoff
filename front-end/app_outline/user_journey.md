# User Journey: Ticked (Task Manager)

**What it is:** A simple task manager. Users jot down tasks, group them into projects, tag them, give them due dates, and tick them off.

**Problem:** To-dos end up scattered across sticky notes, texts and notebooks. Nothing shows what's due soon or what belongs to which project.

**User:** One type: a student or busy person managing their own to-do list. Each person has an account and sees only their own projects and tasks.

## The journey

0. **Accounts** (added in the authentication lecture):
   - **Not logged in** and opens any page → goes to **Log in** (`/login`).
   - **Register** (`/register`): name, email, password (at least 6 characters) → lands on an empty **Tasks** page.
     - Email already used → "That email already has an account. Log in instead."
   - **Log in**: email + password → back to the page they were trying to open, or Tasks.
     - Wrong email or password → "Wrong email or password" (never says which one).
   - **Who am I?** The header always shows their name and a **Log out** button.
   - **Refresh** while logged in → still logged in, same tasks (the session is saved in the browser).
   - **Log out** → back to Log in; the saved session is removed, and the next person sees nothing of theirs.
1. **Opens the app** → lands on **Tasks** (`/`). Sees every task, open ones first, each with its project, due date and tags.
   - First visit (no tasks yet): "Nothing to do yet. Add your first task." with an Add Task button.
2. **Taps "+ New task"** → goes to **New Task** (`/tasks/new`).
3. **Types a title** (e.g. "Finish lab report"), **picks a project** (or "No project"), **picks a due date** (optional), and **taps tags** like `school` or `urgent` (or types a new tag).
   - **Mistake:** taps Save with an empty title → an inline red message appears under the title: "Give your task a title". Nothing else on the form is cleared.
4. **Taps "Save task"** → goes back to **Tasks** with a confirmation toast "Task added". The new task is at the top of the open tasks.
5. **On Tasks**, ticks the checkbox next to a task → it is marked complete, gets a line through it and moves to the Done group. Ticking again re-opens it.
   - Can filter by **status** (All · Open · Done) and by **tag**.
   - Filter shows nothing → "No tasks match this filter" + [Clear filters].
   - Can delete a task with the trash icon. It asks "Delete this task?" first.
6. **Taps "Projects"** in the nav → **Projects** (`/projects`). Sees each project with its description and progress ("2 of 5 done"). Can create a project with a name and description.
   - **Mistake:** Create with an empty name → inline message "Give your project a name".
7. **Taps a project** → **Project Detail** (`/projects/:id`) shows its description and only its tasks. Can tick tasks here too, and "+ Add task to this project" opens New Task with that project already picked.
   - **Delete project** asks "Delete this project? Its tasks stay, but lose their project." first.
8. **Unknown URL** → a friendly 404 page with a link back to Tasks.

## Data rules

- All data lives in Supabase (Postgres). Every read and write goes through ONE file: `front-end/src/data/db.js`.
- Every project and task belongs to the logged-in user (`user_id`). The database fills it in and enforces it with RLS; the app never sends a user id.
- Tags are shared by everyone.
- Same shape as the database: projects, tasks, tags, and a task ↔ tag pairing list. Every row has an `id` (a UUID); projects and tasks have `created_at`.
- No seed data: a new account starts empty.
