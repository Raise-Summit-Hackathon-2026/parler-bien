create or replace function public.list_workspace_members(p_workspace_id uuid)
returns table (
  id uuid,
  user_id uuid,
  email text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = p_workspace_id
      and m.user_id = v_actor_id
  ) then
    raise exception 'Workspace not found or access denied';
  end if;

  return query
  select
    m.id,
    m.user_id,
    u.email::text,
    m.role,
    m.created_at
  from public.workspace_members m
  join auth.users u on u.id = m.user_id
  where m.workspace_id = p_workspace_id
  order by
    case when m.role = 'owner' then 0 else 1 end,
    lower(u.email);
end;
$$;

create or replace function public.invite_workspace_member(
  p_workspace_id uuid,
  p_email text
)
returns table (
  id uuid,
  user_id uuid,
  email text,
  role text,
  created_at timestamptz,
  already_member boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_email text;
  v_target_id uuid;
  v_target_email text;
  v_already_member boolean;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = p_workspace_id
      and m.user_id = v_actor_id
      and m.role = 'owner'
  ) then
    raise exception 'Only workspace owners can invite members';
  end if;

  v_email := lower(trim(coalesce(p_email, '')));
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'Enter a valid email address';
  end if;

  select u.id, u.email::text
  into v_target_id, v_target_email
  from auth.users u
  where lower(u.email) = v_email
  limit 1;

  if v_target_id is null then
    raise exception 'No user found with that email';
  end if;

  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = p_workspace_id
      and m.user_id = v_target_id
  )
  into v_already_member;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (p_workspace_id, v_target_id, 'member')
  on conflict (workspace_id, user_id) do nothing;

  return query
  select
    m.id,
    m.user_id,
    v_target_email,
    m.role,
    m.created_at,
    v_already_member
  from public.workspace_members m
  where m.workspace_id = p_workspace_id
    and m.user_id = v_target_id;
end;
$$;

revoke execute on function public.list_workspace_members(uuid) from public;
revoke execute on function public.list_workspace_members(uuid) from anon;
grant execute on function public.list_workspace_members(uuid) to authenticated;

revoke execute on function public.invite_workspace_member(uuid, text) from public;
revoke execute on function public.invite_workspace_member(uuid, text) from anon;
grant execute on function public.invite_workspace_member(uuid, text) to authenticated;
