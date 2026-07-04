alter table public.workspace_personas
  add column if not exists live_avatar_id text;

comment on column public.workspace_personas.live_avatar_id is
  'Optional HeyGen LiveAvatar public avatar UUID for real-time video sessions.';
