-- Extend personas to full VoiceAgent parity
alter table public.workspace_personas
  add column if not exists tagline text,
  add column if not exists agent_type text not null default 'roleplay'
    check (agent_type in ('language', 'roleplay', 'spiritual')),
  add column if not exists capabilities text[] not null default '{}',
  add column if not exists voice_age_range text,
  add column if not exists voice_gender text default 'random'
    check (voice_gender in ('male', 'female', 'random', 'opposite-speaker')),
  add column if not exists voice_map jsonb not null default '{}'::jsonb,
  add column if not exists delivery_style text,
  add column if not exists coaching_style text,
  add column if not exists skills jsonb not null default '[]'::jsonb,
  add column if not exists preview_script text,
  add column if not exists persona_base text,
  add column if not exists theme_color text default '#3b82f6';

create table if not exists public.workspace_tracks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.user_workspaces(id) on delete cascade,
  persona_id uuid not null references public.workspace_personas(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 160),
  description text,
  theme_color text not null default '#3b82f6',
  estimated_minutes integer not null default 15 check (estimated_minutes > 0),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_levels (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.workspace_tracks(id) on delete cascade,
  position integer not null default 1,
  title text not null check (char_length(trim(title)) between 1 and 160),
  subtitle text not null default '',
  status text not null default 'playable' check (status in ('playable', 'draft')),
  pass_criteria jsonb not null default '{"type":"goal"}'::jsonb,
  room jsonb not null default '{}'::jsonb,
  language_id text,
  region_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (track_id, position)
);

create table if not exists public.workspace_level_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  level_id uuid not null references public.workspace_levels(id) on delete cascade,
  status text not null default 'available'
    check (status in ('available', 'in_progress', 'completed')),
  best_score integer,
  attempts integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, level_id)
);

create index if not exists workspace_tracks_workspace_idx on public.workspace_tracks(workspace_id);
create index if not exists workspace_levels_track_idx on public.workspace_levels(track_id);
create index if not exists workspace_level_progress_user_idx on public.workspace_level_progress(user_id);
create index if not exists workspace_level_progress_level_idx on public.workspace_level_progress(level_id);

drop trigger if exists set_workspace_tracks_updated_at on public.workspace_tracks;
create trigger set_workspace_tracks_updated_at
before update on public.workspace_tracks
for each row execute function public.set_updated_at();

drop trigger if exists set_workspace_levels_updated_at on public.workspace_levels;
create trigger set_workspace_levels_updated_at
before update on public.workspace_levels
for each row execute function public.set_updated_at();

drop trigger if exists set_workspace_level_progress_updated_at on public.workspace_level_progress;
create trigger set_workspace_level_progress_updated_at
before update on public.workspace_level_progress
for each row execute function public.set_updated_at();

alter table public.workspace_tracks enable row level security;
alter table public.workspace_levels enable row level security;
alter table public.workspace_level_progress enable row level security;

grant select, insert, update, delete on public.workspace_tracks to authenticated;
grant select, insert, update, delete on public.workspace_levels to authenticated;
grant select, insert, update, delete on public.workspace_level_progress to authenticated;

-- Tracks: workspace owner access
drop policy if exists "workspace owners can select tracks" on public.workspace_tracks;
create policy "workspace owners can select tracks"
on public.workspace_tracks for select to authenticated
using (
  exists (
    select 1 from public.user_workspaces w
    where w.id = workspace_tracks.workspace_id and w.owner_id = (select auth.uid())
  )
);

drop policy if exists "workspace owners can insert tracks" on public.workspace_tracks;
create policy "workspace owners can insert tracks"
on public.workspace_tracks for insert to authenticated
with check (
  exists (
    select 1 from public.user_workspaces w
    where w.id = workspace_tracks.workspace_id and w.owner_id = (select auth.uid())
  )
);

drop policy if exists "workspace owners can update tracks" on public.workspace_tracks;
create policy "workspace owners can update tracks"
on public.workspace_tracks for update to authenticated
using (
  exists (
    select 1 from public.user_workspaces w
    where w.id = workspace_tracks.workspace_id and w.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.user_workspaces w
    where w.id = workspace_tracks.workspace_id and w.owner_id = (select auth.uid())
  )
);

drop policy if exists "workspace owners can delete tracks" on public.workspace_tracks;
create policy "workspace owners can delete tracks"
on public.workspace_tracks for delete to authenticated
using (
  exists (
    select 1 from public.user_workspaces w
    where w.id = workspace_tracks.workspace_id and w.owner_id = (select auth.uid())
  )
);

-- Levels: via track -> workspace owner
drop policy if exists "workspace owners can select levels" on public.workspace_levels;
create policy "workspace owners can select levels"
on public.workspace_levels for select to authenticated
using (
  exists (
    select 1
    from public.workspace_tracks t
    join public.user_workspaces w on w.id = t.workspace_id
    where t.id = workspace_levels.track_id and w.owner_id = (select auth.uid())
  )
);

drop policy if exists "workspace owners can insert levels" on public.workspace_levels;
create policy "workspace owners can insert levels"
on public.workspace_levels for insert to authenticated
with check (
  exists (
    select 1
    from public.workspace_tracks t
    join public.user_workspaces w on w.id = t.workspace_id
    where t.id = workspace_levels.track_id and w.owner_id = (select auth.uid())
  )
);

drop policy if exists "workspace owners can update levels" on public.workspace_levels;
create policy "workspace owners can update levels"
on public.workspace_levels for update to authenticated
using (
  exists (
    select 1
    from public.workspace_tracks t
    join public.user_workspaces w on w.id = t.workspace_id
    where t.id = workspace_levels.track_id and w.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.workspace_tracks t
    join public.user_workspaces w on w.id = t.workspace_id
    where t.id = workspace_levels.track_id and w.owner_id = (select auth.uid())
  )
);

drop policy if exists "workspace owners can delete levels" on public.workspace_levels;
create policy "workspace owners can delete levels"
on public.workspace_levels for delete to authenticated
using (
  exists (
    select 1
    from public.workspace_tracks t
    join public.user_workspaces w on w.id = t.workspace_id
    where t.id = workspace_levels.track_id and w.owner_id = (select auth.uid())
  )
);

-- Progress: user owns their rows; must own workspace to write
drop policy if exists "users can select own level progress" on public.workspace_level_progress;
create policy "users can select own level progress"
on public.workspace_level_progress for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "users can insert own level progress" on public.workspace_level_progress;
create policy "users can insert own level progress"
on public.workspace_level_progress for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.workspace_levels l
    join public.workspace_tracks t on t.id = l.track_id
    join public.user_workspaces w on w.id = t.workspace_id
    where l.id = workspace_level_progress.level_id and w.owner_id = (select auth.uid())
  )
);

drop policy if exists "users can update own level progress" on public.workspace_level_progress;
create policy "users can update own level progress"
on public.workspace_level_progress for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "users can delete own level progress" on public.workspace_level_progress;
create policy "users can delete own level progress"
on public.workspace_level_progress for delete to authenticated
using (user_id = (select auth.uid()));

comment on table public.workspace_tracks is 'Learning paths inside a workspace, each tied to a persona.';
comment on table public.workspace_levels is 'Ordered levels with pass criteria and room config for workspace tracks.';
comment on table public.workspace_level_progress is 'Per-user progress on workspace levels.';
