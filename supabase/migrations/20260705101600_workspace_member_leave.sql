-- Allow invited members to remove their own membership (leave a workspace).
-- Owners must delete the workspace instead; they cannot leave via membership delete.

drop policy if exists "members can leave workspaces" on public.workspace_members;
create policy "members can leave workspaces"
on public.workspace_members
for delete
to authenticated
using (
  user_id = (select auth.uid())
  and role = 'member'
);
