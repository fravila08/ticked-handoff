-- Ticked task manager: schema from task-manager-erd.png (DrawSQL)
--
-- Written as the diagram shows it, plus these approved changes:
--   * Login is Supabase Auth. public.users is the profile table for it:
--     users.id IS the auth.users id, and deleting the login account deletes
--     the profile (and, through it, the user's projects and tasks).
--   * A trigger on auth.users (on_auth_user_created -> handle_new_user)
--     creates the profile row at sign-up, taking the name from the sign-up
--     metadata (options.data.name) or, if none, from the email. It is the
--     ONLY object in this file outside the app's own tables and functions.
--   * Email uniqueness is case-insensitive (unique index on lower(email)).
--     Users can edit only their name; email is locked (column grant).
--   * projects.user_id and tasks.user_id are not null, default auth.uid()
--     and ON DELETE CASCADE. The app never sends a user id.
--   * tasks.is_complete defaults to false.
--   * Indexes on every foreign-key column.
--   * Tags are global and shared (no user_id), as on the diagram. Any
--     signed-in user can read and add them; nobody can edit or delete them.
--   * RLS is on for every table, with per-user policies (section 6):
--     everyone sees and changes only their own profile, projects, tasks and
--     task_tags, and a task can only go in one of their own projects. The
--     anon role (not signed in) gets no access to anything.
--   * The project's rls_auto_enable() event-trigger function (it turns RLS
--     on for new tables) is not part of this file and must never be dropped.
--
-- History: the first version had no login. Its tables were dropped on
-- 2026-10-19 (rows backed up to supabase/backups/, not re-imported because
-- they belonged to a Demo User with no login), together with the temporary
-- "dev: open access until auth" anon policies, and rebuilt from this file.
--
-- Tables are in dependency order (a table comes after the tables it
-- references), which is also the order they were created in Supabase:
--   1. users  2. projects  3. tags  4. tasks  5. task_tags
-- then 6. RLS policies and 7. create_task_with_tags.
--
-- ON DELETE rules are not drawn on the diagram. The ones below follow the
-- app's documented behaviour (CLAUDE.md): deleting a project keeps its tasks
-- (project_id becomes null), deleting a task removes its task_tags rows.
-- Deleting a user removes all their projects and tasks.


-- 1. users ---------------------------------------------------------------
-- Story 1: an account with a name and email. One profile row per login
-- account (auth.users).
create table public.users (
  id          uuid         primary key references auth.users (id) on delete cascade,
  name        varchar(100) not null,
  email       varchar(255) not null,
  created_at  timestamptz  not null default now()
);

create unique index users_email_lower_key on public.users (lower(email));

alter table public.users enable row level security;

-- Creates the profile row when someone signs up.
-- security definer: it runs as its owner, because the person signing up
-- has no session yet and RLS would block the insert.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, name, email)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
                  split_part(new.email, '@', 1)), 100),
    new.email
  );
  return new;
end;
$$;

-- Only the trigger should run it, never the REST API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. projects ------------------------------------------------------------
-- Story 2: projects with a name and an optional description.
create table public.projects (
  id           uuid         primary key default gen_random_uuid(),
  name         varchar(255) not null,
  description  text,
  user_id      uuid         not null default auth.uid()
                            references public.users (id) on delete cascade,
  created_at   timestamptz  not null default now()
);

create index projects_user_id_idx on public.projects (user_id);

alter table public.projects enable row level security;


-- 3. tags ----------------------------------------------------------------
-- Story 7: labels like "school" or "urgent". Shared by everyone, no owner.
create table public.tags (
  id    uuid        primary key default gen_random_uuid(),
  name  varchar(50) not null unique
);

alter table public.tags enable row level security;


-- 4. tasks ---------------------------------------------------------------
-- Stories 3, 4, 5, 6, 8: title, optional project, optional due date,
-- complete flag, created time.
create table public.tasks (
  id           uuid         primary key default gen_random_uuid(),
  title        varchar(255) not null,
  is_complete  boolean      not null default false,
  due_date     date,
  project_id   uuid         references public.projects (id) on delete set null,
  user_id      uuid         not null default auth.uid()
                            references public.users (id) on delete cascade,
  created_at   timestamptz  not null default now()
);

create index tasks_user_id_idx    on public.tasks (user_id);
create index tasks_project_id_idx on public.tasks (project_id);

alter table public.tasks enable row level security;


-- 5. task_tags -----------------------------------------------------------
-- Story 7: many-to-many join, a task can have several tags.
create table public.task_tags (
  task_id  uuid not null references public.tasks (id) on delete cascade,
  tag_id   uuid not null references public.tags (id)  on delete cascade,
  primary key (task_id, tag_id)
);

-- task_id is covered by the primary key; tag_id needs its own index.
create index task_tags_tag_id_idx on public.task_tags (tag_id);

alter table public.task_tags enable row level security;


-- 6. RLS policies --------------------------------------------------------
-- Every policy is for the authenticated role only, so anon gets nothing.
-- (select auth.uid()) is evaluated once per query, not once per row.
-- ON DELETE actions (cascade / set null) are not subject to RLS.

-- users: see and rename only yourself. Rows are created by the sign-up
-- trigger and deleted with the login account, so no insert/delete policies.
create policy "users: read own row" on public.users
  for select to authenticated
  using (id = (select auth.uid()));

create policy "users: update own row" on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Only the name can be edited; email, id and created_at are locked.
revoke update on public.users from anon, authenticated;
grant update (name) on public.users to authenticated;


-- projects: full access to your own, nothing else.
create policy "projects: read own" on public.projects
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "projects: insert own" on public.projects
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "projects: update own" on public.projects
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "projects: delete own" on public.projects
  for delete to authenticated
  using (user_id = (select auth.uid()));


-- tags: shared. Any signed-in user can read and add; nobody edits or deletes.
create policy "tags: read all" on public.tags
  for select to authenticated
  using (true);

create policy "tags: add" on public.tags
  for insert to authenticated
  with check (true);


-- tasks: your own only, and a task can only go in one of your own projects.
create policy "tasks: read own" on public.tasks
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "tasks: insert own" on public.tasks
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (project_id is null or exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = (select auth.uid())
    ))
  );

create policy "tasks: update own" on public.tasks
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (project_id is null or exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = (select auth.uid())
    ))
  );

create policy "tasks: delete own" on public.tasks
  for delete to authenticated
  using (user_id = (select auth.uid()));


-- task_tags: follow the task. You can see, add and remove tags only on your own tasks.
create policy "task_tags: read own" on public.task_tags
  for select to authenticated
  using (exists (
    select 1 from public.tasks t
    where t.id = task_id and t.user_id = (select auth.uid())
  ));

create policy "task_tags: add to own task" on public.task_tags
  for insert to authenticated
  with check (exists (
    select 1 from public.tasks t
    where t.id = task_id and t.user_id = (select auth.uid())
  ));

create policy "task_tags: remove from own task" on public.task_tags
  for delete to authenticated
  using (exists (
    select 1 from public.tasks t
    where t.id = task_id and t.user_id = (select auth.uid())
  ));


-- 7. API: create_task_with_tags ------------------------------------------
-- Stories 3 and 7: save a new task and its tags in one go. The app calls
-- this as supabase.rpc('create_task_with_tags', {...}). It runs as one
-- transaction, so either the task and all its tags are saved, or nothing is
-- (for example, an unknown tag id leaves no half-made task behind).
-- security invoker: it runs as the signed-in caller, so RLS applies
-- (the task is theirs, its project must be theirs). user_id comes from
-- the column default, auth.uid(). Duplicate and null tag ids are ignored.
create function public.create_task_with_tags(
  p_title      text,
  p_project_id uuid   default null,
  p_due_date   date   default null,
  p_tag_ids    uuid[] default '{}'
)
returns public.tasks
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_task public.tasks;
begin
  insert into public.tasks (title, project_id, due_date)
  values (p_title, p_project_id, p_due_date)
  returning * into v_task;

  insert into public.task_tags (task_id, tag_id)
  select v_task.id, t.tag_id
  from (select distinct unnest(coalesce(p_tag_ids, '{}'::uuid[])) as tag_id) t
  where t.tag_id is not null;

  return v_task;
end;
$$;

-- Signed-in users only. Supabase grants new functions to anon by default,
-- so anon has to be revoked by name as well as public.
revoke execute on function public.create_task_with_tags(text, uuid, date, uuid[]) from public, anon;
grant execute on function public.create_task_with_tags(text, uuid, date, uuid[]) to authenticated;
