-- Creates a public."User" profile row atomically whenever a new row is
-- inserted into Supabase's auth.users — see docs/adr/002-authentication-architecture.md §2.
-- security definer + explicit search_path so it can write to public."User"
-- regardless of the invoking role.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public."User" (id, email, "createdAt", "updatedAt")
  values (new.id, new.email, now(), now())
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
