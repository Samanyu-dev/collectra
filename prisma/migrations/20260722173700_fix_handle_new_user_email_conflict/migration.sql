-- Fixes a real bug in handle_new_user (found via testing, not assumed): the
-- original `on conflict (id) do nothing` only guards against a re-run for the
-- same id. It does NOT guard against the exact scenario the legacy-migration
-- flow (docs/adr/002-authentication-architecture.md §10) exists for — a
-- pre-existing legacy User row (id "user_1") holding the real user's email.
-- When that user signs up for real, Supabase creates a new auth.users row
-- with a *new* id but the *same* email, and the trigger's insert then hits
-- User.email's unique constraint (not caught by `on conflict (id)`), which
-- fails the trigger and rolls back the entire signup transaction — nobody
-- could actually complete the migration signup this trigger was built for.
--
-- Fix: `on conflict do nothing` with no target catches a conflict on *any*
-- unique constraint on the table (id or email). If it's an email conflict
-- from a legacy row, the insert is skipped here; getCurrentUser()'s
-- migrateLegacyDataIfNeeded() then reassigns the legacy row's data and
-- deletes it, and the subsequent prisma.user.upsert() in getCurrentUser()
-- creates the real profile row once the email is free.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public."User" (id, email, "createdAt", "updatedAt")
  values (new.id, new.email, now(), now())
  on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
