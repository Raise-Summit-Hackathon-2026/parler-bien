create extension if not exists pgcrypto with schema extensions;

create table if not exists public.user_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,80}$'),
  description text,
  company_name text,
  purpose text not null default 'roleplay_training',
  visibility text not null default 'private' check (visibility in ('private', 'shared')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug)
);

create table if not exists public.workspace_personas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.user_workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  role_title text,
  voice_tone text,
  instructions text not null default '',
  greeting text,
  avatar_prompt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.persona_context_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.user_workspaces(id) on delete cascade,
  persona_id uuid references public.workspace_personas(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('text', 'file', 'photo')),
  title text not null check (char_length(trim(title)) between 1 and 160),
  body_text text,
  storage_bucket text,
  storage_path text,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  source_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint persona_context_has_source check (
    (kind = 'text' and body_text is not null and storage_path is null)
    or
    (kind in ('file', 'photo') and storage_bucket is not null and storage_path is not null)
  )
);

create table if not exists public.workspace_share_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.user_workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  token text not null unique default replace(replace(trim(trailing '=' from encode(gen_random_bytes(24), 'base64')), '+', '-'), '/', '_'),
  permission text not null default 'read' check (permission in ('read', 'edit')),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_workspaces_owner_idx on public.user_workspaces(owner_id);
create index if not exists workspace_personas_workspace_idx on public.workspace_personas(workspace_id);
create index if not exists persona_context_workspace_idx on public.persona_context_items(workspace_id);
create index if not exists persona_context_persona_idx on public.persona_context_items(persona_id);
create index if not exists workspace_share_links_workspace_idx on public.workspace_share_links(workspace_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_workspaces_updated_at on public.user_workspaces;
create trigger set_user_workspaces_updated_at
before update on public.user_workspaces
for each row execute function public.set_updated_at();

drop trigger if exists set_workspace_personas_updated_at on public.workspace_personas;
create trigger set_workspace_personas_updated_at
before update on public.workspace_personas
for each row execute function public.set_updated_at();

alter table public.user_workspaces enable row level security;
alter table public.workspace_personas enable row level security;
alter table public.persona_context_items enable row level security;
alter table public.workspace_share_links enable row level security;

grant select, insert, update, delete on public.user_workspaces to authenticated;
grant select, insert, update, delete on public.workspace_personas to authenticated;
grant select, insert, update, delete on public.persona_context_items to authenticated;
grant select, insert, update, delete on public.workspace_share_links to authenticated;

drop policy if exists "workspace owners can select workspaces" on public.user_workspaces;
create policy "workspace owners can select workspaces"
on public.user_workspaces
for select
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "users can create owned workspaces" on public.user_workspaces;
create policy "users can create owned workspaces"
on public.user_workspaces
for insert
to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists "workspace owners can update workspaces" on public.user_workspaces;
create policy "workspace owners can update workspaces"
on public.user_workspaces
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "workspace owners can delete workspaces" on public.user_workspaces;
create policy "workspace owners can delete workspaces"
on public.user_workspaces
for delete
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "workspace owners can select personas" on public.workspace_personas;
create policy "workspace owners can select personas"
on public.workspace_personas
for select
to authenticated
using (
  exists (
    select 1
    from public.user_workspaces workspace
    where workspace.id = workspace_personas.workspace_id
      and workspace.owner_id = (select auth.uid())
  )
);

drop policy if exists "workspace owners can create personas" on public.workspace_personas;
create policy "workspace owners can create personas"
on public.workspace_personas
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.user_workspaces workspace
    where workspace.id = workspace_personas.workspace_id
      and workspace.owner_id = (select auth.uid())
  )
);

drop policy if exists "workspace owners can update personas" on public.workspace_personas;
create policy "workspace owners can update personas"
on public.workspace_personas
for update
to authenticated
using (
  exists (
    select 1
    from public.user_workspaces workspace
    where workspace.id = workspace_personas.workspace_id
      and workspace.owner_id = (select auth.uid())
  )
)
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.user_workspaces workspace
    where workspace.id = workspace_personas.workspace_id
      and workspace.owner_id = (select auth.uid())
  )
);

drop policy if exists "workspace owners can delete personas" on public.workspace_personas;
create policy "workspace owners can delete personas"
on public.workspace_personas
for delete
to authenticated
using (
  exists (
    select 1
    from public.user_workspaces workspace
    where workspace.id = workspace_personas.workspace_id
      and workspace.owner_id = (select auth.uid())
  )
);

drop policy if exists "workspace owners can select context" on public.persona_context_items;
create policy "workspace owners can select context"
on public.persona_context_items
for select
to authenticated
using (
  exists (
    select 1
    from public.user_workspaces workspace
    where workspace.id = persona_context_items.workspace_id
      and workspace.owner_id = (select auth.uid())
  )
);

drop policy if exists "workspace owners can create context" on public.persona_context_items;
create policy "workspace owners can create context"
on public.persona_context_items
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.user_workspaces workspace
    where workspace.id = persona_context_items.workspace_id
      and workspace.owner_id = (select auth.uid())
  )
);

drop policy if exists "workspace owners can update context" on public.persona_context_items;
create policy "workspace owners can update context"
on public.persona_context_items
for update
to authenticated
using (
  exists (
    select 1
    from public.user_workspaces workspace
    where workspace.id = persona_context_items.workspace_id
      and workspace.owner_id = (select auth.uid())
  )
)
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.user_workspaces workspace
    where workspace.id = persona_context_items.workspace_id
      and workspace.owner_id = (select auth.uid())
  )
);

drop policy if exists "workspace owners can delete context" on public.persona_context_items;
create policy "workspace owners can delete context"
on public.persona_context_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.user_workspaces workspace
    where workspace.id = persona_context_items.workspace_id
      and workspace.owner_id = (select auth.uid())
  )
);

drop policy if exists "workspace owners can select share links" on public.workspace_share_links;
create policy "workspace owners can select share links"
on public.workspace_share_links
for select
to authenticated
using (
  exists (
    select 1
    from public.user_workspaces workspace
    where workspace.id = workspace_share_links.workspace_id
      and workspace.owner_id = (select auth.uid())
  )
);

drop policy if exists "workspace owners can create share links" on public.workspace_share_links;
create policy "workspace owners can create share links"
on public.workspace_share_links
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.user_workspaces workspace
    where workspace.id = workspace_share_links.workspace_id
      and workspace.owner_id = (select auth.uid())
  )
);

drop policy if exists "workspace owners can update share links" on public.workspace_share_links;
create policy "workspace owners can update share links"
on public.workspace_share_links
for update
to authenticated
using (
  exists (
    select 1
    from public.user_workspaces workspace
    where workspace.id = workspace_share_links.workspace_id
      and workspace.owner_id = (select auth.uid())
  )
)
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.user_workspaces workspace
    where workspace.id = workspace_share_links.workspace_id
      and workspace.owner_id = (select auth.uid())
  )
);

drop policy if exists "workspace owners can delete share links" on public.workspace_share_links;
create policy "workspace owners can delete share links"
on public.workspace_share_links
for delete
to authenticated
using (
  exists (
    select 1
    from public.user_workspaces workspace
    where workspace.id = workspace_share_links.workspace_id
      and workspace.owner_id = (select auth.uid())
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'persona-context',
  'persona-context',
  false,
  10485760,
  array[
    'application/pdf',
    'text/plain',
    'text/markdown',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users can read own persona context files" on storage.objects;
create policy "users can read own persona context files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'persona-context'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "users can upload own persona context files" on storage.objects;
create policy "users can upload own persona context files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'persona-context'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "users can update own persona context files" on storage.objects;
create policy "users can update own persona context files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'persona-context'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'persona-context'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "users can delete own persona context files" on storage.objects;
create policy "users can delete own persona context files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'persona-context'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

comment on table public.user_workspaces is
  'User-owned training workspaces, such as a brand, client, team, or course.';

comment on table public.workspace_personas is
  'Roleplay personas attached to user-owned workspaces.';

comment on table public.persona_context_items is
  'Text snippets, documents, and photos that ground a workspace persona.';

comment on table public.workspace_share_links is
  'Owner-created share tokens for workspace handoff and collaboration flows.';
