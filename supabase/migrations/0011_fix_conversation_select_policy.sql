drop policy if exists "Users can view accessible conversations" on public.conversations;
create policy "Users can view accessible conversations"
on public.conversations for select
using (
  auth.uid() is not null
  and (
    public.is_conversation_participant(id)
    or public.current_profile_role() in ('admin', 'manager')
    or public.can_access_related_entity(related_entity_type, related_entity_id)
  )
);
