-- Live interview viewer (app/admin/live/[id]) watches a single response row
-- over Supabase Realtime postgres_changes, which only emits for tables that
-- belong to the supabase_realtime publication.
--
-- Adding the table is all this does. No policy is created or altered:
-- responses_owner_all (20260701000000_init.sql) already scopes select to
-- auth.uid() = user_id, and Realtime evaluates that same policy per
-- subscriber before delivering a change, so an admin can only ever receive
-- rows they could already read. The default replica identity (primary key)
-- is enough here, since the viewer reads the new row on update and never
-- looks at old values or deletes.
--
-- Guarded both ways so this is a no-op on a database where the publication
-- is missing entirely, or where the table was already added by hand in the
-- Supabase dashboard.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'responses'
     )
  then
    alter publication supabase_realtime add table public.responses;
  end if;
end
$$;
