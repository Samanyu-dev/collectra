-- Per docs/adr/002-authentication-architecture.md §6: user-uploads is now a
-- private bucket (flipped via the Storage API, not SQL). This policy scopes
-- every authenticated user to objects under their own users/{userId}/... prefix.
drop policy if exists "Users can access their own storage objects" on storage.objects;
create policy "Users can access their own storage objects"
on storage.objects for all
to authenticated
using (
  bucket_id = 'user-uploads'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'user-uploads'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = auth.uid()::text
);
