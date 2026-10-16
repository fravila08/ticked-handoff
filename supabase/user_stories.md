# Task Manager: user stories

Pulled from Ticked's `front-end/app_outline/` (the journey and each page's `user_story.md`) into one list: one line per thing the app has to *remember*. Story 1 isn't on any page; it's added so the database knows who owns what.

Since the authentication lecture, story 1 has screens: Register and Log in. Every project and task belongs to the logged-in user, and nobody sees anyone else's (RLS: `auth.uid() = user_id`). Tags are shared.

1. As a user, I want an account with my name, email and password so that only I can see and change my projects and tasks.
2. As a user, I want to create projects with a name and a description so that I can organize my work.
3. As a user, I want to create tasks with a title so that I can track what I need to do.
4. As a user, I want to assign a task to a project (or leave it on its own) so that I can keep related work together.
5. As a user, I want to give a task a due date so that I know what's coming up.
6. As a user, I want to mark tasks as complete so that I know what I've finished.
7. As a user, I want to label tasks with tags like "school" or "urgent" (a task can have several) so that I can filter my list.
8. As a user, I want to see when each task was created so that I can spot old ones.
