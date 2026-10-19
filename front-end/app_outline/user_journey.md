# User Journey: Ticked (Task Manager)

**What it is:** A simple task manager. Users jot down tasks, group them into projects, tag them, give them due dates, and tick them off.

**Problem:** To-dos end up scattered across sticky notes, texts and notebooks. Nothing shows what's due soon or what belongs to which project.

**User:** One type: a student or busy person managing their own to-do list. Each person has their own account and sees only their own projects and tasks. Tags are shared: everyone can use (and add) the same tags.

## The journey

1. **Opens the app** → if they aren't logged in, lands on **Log in** (`/login`). Opening any other page while logged out also goes to Log in, and comes back to that page after logging in.
   - Log in asks for **email** and **password**.
   - **New here:** taps "Create an account" → **Register** (`/register`): **name**, **email**, **password** (at least 6 characters). Creating the account logs them straight in, with a toast "Welcome, {name}".
   - **Mistakes:** an empty field → "Give your name" / "Enter your email" / "Enter your password" under that field; a short password → "Password must be at least 6 characters"; an email that already has an account → "An account with this email already exists"; a wrong email or password at Log in → "Wrong email or password" (the email stays, the password is cleared).
2. **Logged in** → lands on **Tasks** (`/`) with a toast "Welcome, {name}". Sees every one of their tasks, open ones first, each with its project, due date and tags. The top bar shows their name and a **Log out** button.
   - First visit (no tasks yet): "Nothing to do yet. Add your first task." with an Add Task button.
3. **Taps "+ New task"** → goes to **New Task** (`/tasks/new`).
4. **Types a title** (e.g. "Finish lab report"), **picks a project** (or "No project"), **picks a due date** (optional), and **taps tags** like `school` or `urgent` (or types a new tag).
   - **Mistake:** taps Save with an empty title → an inline red message appears under the title: "Give your task a title". Nothing else on the form is cleared.
5. **Taps "Save task"** → goes back to **Tasks** with a confirmation toast "Task added". The new task is at the top of the open tasks.
6. **On Tasks**, ticks the checkbox next to a task → it is marked complete, gets a line through it and moves to the Done group. Ticking again re-opens it.
   - Can filter by **status** (All · Open · Done) and by **tag**.
   - Filter shows nothing → "No tasks match this filter" + [Clear filters].
   - Can delete a task with the trash icon. It asks "Delete this task?" first.
7. **Taps "Projects"** in the nav → **Projects** (`/projects`). Sees each of their projects with its description and progress ("2 of 5 done"). Can create a project with a name and description.
   - **Mistake:** Create with an empty name → inline message "Give your project a name".
8. **Taps a project** → **Project Detail** (`/projects/:id`) shows its description and only its tasks. Can tick tasks here too, and "+ Add task to this project" opens New Task with that project already picked.
   - **Delete project** asks "Delete this project? Its tasks stay, but lose their project." first.
9. **Unknown URL** → a friendly 404 page with a link back to Tasks.
10. **Refreshes the page, or comes back later** → still logged in: the app checks the saved login with Supabase and reloads their own data. (A login Supabase no longer accepts, e.g. a deleted account, goes back to Log in.)
11. **Taps "Log out"** → back to **Log in** with a toast "Signed out". The saved login is removed from the browser, and their data is cleared from the screen.

## Data rules

- The data lives in a Supabase (Postgres) database, so it survives a refresh. Logging in uses Supabase Auth. The database's row level security makes sure each user only reads and changes their own projects and tasks.
- Keep all reading and changing of data (and logging in) in ONE place (a data layer / context), so the rest of the app never talks to the database directly.
- Use the same shape as the database: projects, tasks, tags, and a task ↔ tag pairing list. Every row has an `id` (a UUID) and `created_at`.
- A new account starts empty. (The seed data below was only for the first, in-memory version of the app.)
  - Projects: **School** ("Classes and homework"), **Home** ("Chores and errands"), **Side Project** ("The portfolio app").
  - Tags: `school`, `urgent`, `errands`, `reading`.
  - Tasks (6): "Finish lab report" (School, due in 2 days, school + urgent), "Read chapter 4" (School, due in 5 days, school + reading), "Buy groceries" (Home, due tomorrow, errands), "Fix leaky faucet" (Home, no due date, done), "Sketch the home page" (Side Project, due in 7 days), "Call the dentist" (no project, due today, urgent).
