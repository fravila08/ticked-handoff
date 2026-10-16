-- Ticked task manager: schema WITH authentication (Supabase Auth)
--
-- Same five tables as before (users, projects, tags, tasks, task_tags),
-- rebuilt so every row knows who owns it:
--
--   auth.users  ── trigger ──►  public.users
--   (Supabase                        │ user_id (foreign key)
--    manages it)                     ▼
--                         public.projects, public.tasks
--                                    │
--                          RLS: auth.uid() = user_id
--
-- What changed from the no-login version:
--   * public.users.id IS the auth.users id (no default of its own). A trigger
--     makes the public.users row the moment someone registers.
--   * projects.user_id and tasks.user_id are NOT NULL and default to
--     auth.uid(), so the app never sends a user id: the database takes it
--     from the logged-in user's access token (JWT).
--   * Deleting a user deletes their projects and tasks (on delete cascade).
--   * The "dev: open access until auth" policies are gone. Every policy is
--     "to authenticated": the publishable key on its own (anon) sees nothing.
--   * create_task_with_tags no longer takes p_user_id.
--   * Tags stay global and shared: any logged-in user can read and add them.
--
-- Run it on an EMPTY project: Supabase → SQL Editor → paste → Run.
-- Tables are in dependency order: users, projects, tags, tasks, task_tags.


-- 1. users ---------------------------------------------------------------
-- A mirror of auth.users. Supabase Auth owns the login (email + password);
-- this table holds what the app shows (the name).
create table public.users (
  id          uuid         primary key references auth.users (id) on delete cascade,
  name        varchar(100) not null,
  email       varchar(255) not null,
  created_at  timestamptz  not null default now()
);

create unique index users_email_lower_key on public.users (lower(email));

alter table public.users enable row level security;

create policy "Users can view own profile" on public.users
  for select to authenticated
  using (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No insert or delete policy: only the trigger below adds rows, and deleting
-- the auth.users row removes this one (on delete cascade).


-- 1b. the trigger: auth.users → public.users ------------------------------
-- Runs inside Supabase Auth's insert, so it needs security definer (it
-- writes to public.users as the function's owner, not as the new user).
-- The name comes from the Register form (signUp options.data.name).
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
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)), 100),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. projects ------------------------------------------------------------
create table public.projects (
  id           uuid         primary key default gen_random_uuid(),
  name         varchar(255) not null,
  description  text,
  user_id      uuid         not null default auth.uid() references public.users (id) on delete cascade,
  created_at   timestamptz  not null default now()
);

create index projects_user_id_idx on public.projects (user_id);

alter table public.projects enable row level security;

create policy "Users can view own projects" on public.projects
  for select to authenticated using (auth.uid() = user_id);

create policy "Users can add own projects" on public.projects
  for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can update own projects" on public.projects
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own projects" on public.projects
  for delete to authenticated using (auth.uid() = user_id);


-- 3. tags ----------------------------------------------------------------
-- Shared by everyone (no user_id), as on the diagram.
create table public.tags (
  id    uuid        primary key default gen_random_uuid(),
  name  varchar(50) not null unique
);

alter table public.tags enable row level security;

create policy "Logged-in users can view tags" on public.tags
  for select to authenticated using (true);

create policy "Logged-in users can add tags" on public.tags
  for insert to authenticated with check (true);


-- 4. tasks ---------------------------------------------------------------
create table public.tasks (
  id           uuid         primary key default gen_random_uuid(),
  title        varchar(255) not null,
  is_complete  boolean      not null default false,
  due_date     date,
  project_id   uuid         references public.projects (id) on delete set null,
  user_id      uuid         not null default auth.uid() references public.users (id) on delete cascade,
  created_at   timestamptz  not null default now()
);

create index tasks_user_id_idx    on public.tasks (user_id);
create index tasks_project_id_idx on public.tasks (project_id);

alter table public.tasks enable row level security;

-- The curriculum's policy: users can only see their own tasks.
create policy "Users can view own tasks" on public.tasks
  for select to authenticated using (auth.uid() = user_id);

-- A new or changed task must be yours, and its project (if any) must be yours too.
create policy "Users can add own tasks" on public.tasks
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and (project_id is null or exists (
      select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()))
  );

create policy "Users can update own tasks" on public.tasks
  for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (project_id is null or exists (
      select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()))
  );

create policy "Users can delete own tasks" on public.tasks
  for delete to authenticated using (auth.uid() = user_id);


-- 5. task_tags -----------------------------------------------------------
-- No user_id here: a pairing belongs to whoever owns its task.
create table public.task_tags (
  task_id  uuid not null references public.tasks (id) on delete cascade,
  tag_id   uuid not null references public.tags (id)  on delete cascade,
  primary key (task_id, tag_id)
);

create index task_tags_tag_id_idx on public.task_tags (tag_id);

alter table public.task_tags enable row level security;

create policy "Users can view tags on own tasks" on public.task_tags
  for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid()));

create policy "Users can tag own tasks" on public.task_tags
  for insert to authenticated
  with check (exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid()));

create policy "Users can untag own tasks" on public.task_tags
  for delete to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid()));


-- 6. API: create_task_with_tags ------------------------------------------
-- Save a task and its tags in one transaction. The owner is NOT a parameter:
-- tasks.user_id defaults to auth.uid(), the user in the request's token.
-- security invoker = it runs as the caller, so the RLS policies above apply.
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

revoke execute on function public.create_task_with_tags(text, uuid, date, uuid[]) from public, anon;
grant execute on function public.create_task_with_tags(text, uuid, date, uuid[]) to authenticated;
