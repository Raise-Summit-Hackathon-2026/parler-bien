-- Replace personas/tracks/levels/context with workspace_members + characters

drop table if exists public.workspace_level_progress cascade;
drop table if exists public.workspace_levels cascade;
drop table if exists public.workspace_tracks cascade;
drop table if exists public.persona_context_items cascade;
drop table if exists public.workspace_personas cascade;

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.user_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists workspace_members_workspace_idx
  on public.workspace_members(workspace_id);
create index if not exists workspace_members_user_idx
  on public.workspace_members(user_id);

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.user_workspaces(id) on delete cascade,
  scenario jsonb not null,
  created_at timestamptz not null default now(),
  constraint characters_scope_check check (
    workspace_id is not null or created_by is not null
  )
);

create index if not exists characters_workspace_idx on public.characters(workspace_id);
create index if not exists characters_created_by_idx on public.characters(created_by);
create index if not exists characters_personal_idx
  on public.characters(created_by)
  where workspace_id is null;

-- Backfill owners as members for existing workspaces
insert into public.workspace_members (workspace_id, user_id, role)
select w.id, w.owner_id, 'owner'
from public.user_workspaces w
on conflict (workspace_id, user_id) do nothing;

alter table public.workspace_members enable row level security;
alter table public.characters enable row level security;

grant select, insert, update, delete on public.workspace_members to authenticated;
grant select, insert, update, delete on public.characters to authenticated;

-- Helper: is the current user a member of a workspace?
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = p_workspace_id
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_workspace_owner(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = p_workspace_id
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
  );
$$;

-- Auto-add owner to workspace_members on workspace creation
create or replace function public.add_workspace_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (workspace_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists add_workspace_owner_member on public.user_workspaces;
create trigger add_workspace_owner_member
after insert on public.user_workspaces
for each row execute function public.add_workspace_owner_member();

-- Join workspace via share token
create or replace function public.join_workspace_via_token(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select l.workspace_id
  into v_workspace_id
  from public.workspace_share_links l
  where l.token = p_token
    and l.revoked_at is null
    and (l.expires_at is null or l.expires_at > now())
  limit 1;

  if v_workspace_id is null then
    raise exception 'Invalid or expired share link';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, v_user_id, 'member')
  on conflict (workspace_id, user_id) do nothing;

  return v_workspace_id;
end;
$$;

grant execute on function public.join_workspace_via_token(text) to authenticated;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_owner(uuid) to authenticated;

-- Update user_workspaces RLS: members can select
drop policy if exists "workspace owners can select workspaces" on public.user_workspaces;
create policy "workspace members can select workspaces"
on public.user_workspaces
for select
to authenticated
using (
  public.is_workspace_member(id)
);

-- workspace_members policies
drop policy if exists "members can select workspace roster" on public.workspace_members;
create policy "members can select workspace roster"
on public.workspace_members
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "owners can insert workspace members" on public.workspace_members;
create policy "owners can insert workspace members"
on public.workspace_members
for insert
to authenticated
with check (
  public.is_workspace_owner(workspace_id)
  or (
    role = 'owner'
    and user_id = (select auth.uid())
    and exists (
      select 1 from public.user_workspaces w
      where w.id = workspace_id and w.owner_id = (select auth.uid())
    )
  )
);

drop policy if exists "owners can delete workspace members" on public.workspace_members;
create policy "owners can delete workspace members"
on public.workspace_members
for delete
to authenticated
using (
  public.is_workspace_owner(workspace_id)
  and user_id <> (select auth.uid())
);

-- characters policies
drop policy if exists "users can select personal characters" on public.characters;
create policy "users can select characters"
on public.characters
for select
to authenticated
using (
  (workspace_id is null and created_by = (select auth.uid()))
  or (workspace_id is not null and public.is_workspace_member(workspace_id))
);

drop policy if exists "users can insert characters" on public.characters;
create policy "users can insert characters"
on public.characters
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (
    workspace_id is null
    or public.is_workspace_member(workspace_id)
  )
);

drop policy if exists "users can delete characters" on public.characters;
create policy "users can delete characters"
on public.characters
for delete
to authenticated
using (
  created_by = (select auth.uid())
  or (
    workspace_id is not null
    and public.is_workspace_owner(workspace_id)
  )
);

comment on table public.workspace_members is
  'Many-to-many membership between users and workspaces.';
comment on table public.characters is
  'Generated practice characters owned by a user (free play) or a workspace group.';
