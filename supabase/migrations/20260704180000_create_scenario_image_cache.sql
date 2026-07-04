create table if not exists public.scenario_image_cache (
  cache_key text primary key,
  image_prompt text not null,
  image_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scenario_image_cache enable row level security;

comment on table public.scenario_image_cache is
  'Server-side cache for generated scenario images.';
