-- Run this in the Supabase SQL editor after your first `prisma db push`.
-- Prisma does not manage RLS, so policies are kept here as plain SQL.

alter table profiles enable row level security;
alter table events enable row level security;
alter table event_sections enable row level security;
alter table ticket_types enable row level security;
alter table tickets enable row level security;
alter table voting_campaigns enable row level security;
alter table nominees enable row level security;
alter table votes enable row level security;
alter table transactions enable row level security;

-- Auto-create a profile row when a Supabase auth user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, "fullName")
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Profiles: everyone can read public profile fields; users manage their own row.
create policy "profiles are viewable by everyone"
  on profiles for select using (true);

create policy "users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- Events: published events are public; organizers manage their own; admins manage all.
create policy "published events are public"
  on events for select using (status = 'PUBLISHED' or organizer_id = auth.uid());

create policy "organizers manage their own events"
  on events for insert with check (organizer_id = auth.uid());

create policy "organizers update their own events"
  on events for update using (organizer_id = auth.uid());

create policy "organizers delete their own events"
  on events for delete using (organizer_id = auth.uid());

-- Event sections / ticket types follow the parent event's organizer.
create policy "sections follow parent event visibility"
  on event_sections for select using (
    exists (
      select 1 from events
      where events.id = event_sections."eventId"
      and (events.status = 'PUBLISHED' or events.organizer_id = auth.uid())
    )
  );

create policy "organizers manage sections on their events"
  on event_sections for all using (
    exists (
      select 1 from events
      where events.id = event_sections."eventId"
      and events.organizer_id = auth.uid()
    )
  );

create policy "ticket types follow section visibility"
  on ticket_types for select using (
    exists (
      select 1 from event_sections
      join events on events.id = event_sections."eventId"
      where event_sections.id = ticket_types."sectionId"
      and (events.status = 'PUBLISHED' or events.organizer_id = auth.uid())
    )
  );

create policy "organizers manage ticket types on their events"
  on ticket_types for all using (
    exists (
      select 1 from event_sections
      join events on events.id = event_sections."eventId"
      where event_sections.id = ticket_types."sectionId"
      and events.organizer_id = auth.uid()
    )
  );

-- Tickets: owners can see their own tickets; organizers can see tickets for their events.
create policy "owners view their own tickets"
  on tickets for select using (owner_id = auth.uid());

create policy "organizers view tickets for their events"
  on tickets for select using (
    exists (
      select 1 from ticket_types
      join event_sections on event_sections.id = ticket_types."sectionId"
      join events on events.id = event_sections."eventId"
      where ticket_types.id = tickets."ticketTypeId"
      and events.organizer_id = auth.uid()
    )
  );

-- Voting campaigns / nominees: public read, organizer-managed writes.
create policy "voting campaigns are public"
  on voting_campaigns for select using (true);

create policy "organizers manage their voting campaigns"
  on voting_campaigns for all using (organizer_id = auth.uid());

create policy "nominees are public"
  on nominees for select using (true);

create policy "organizers manage nominees on their campaigns"
  on nominees for all using (
    exists (
      select 1 from voting_campaigns
      where voting_campaigns.id = nominees."campaignId"
      and voting_campaigns.organizer_id = auth.uid()
    )
  );

-- Admin override: profiles with role = 'ADMIN' bypass via a permissive policy.
create policy "admins manage everything on events"
  on events for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'ADMIN')
  );

-- Storage: public bucket for event cover images, uploads scoped to the owner's folder.
insert into storage.buckets (id, name, public)
values ('event-covers', 'event-covers', true)
on conflict (id) do nothing;

create policy "event covers are publicly readable"
  on storage.objects for select using (bucket_id = 'event-covers');

create policy "users upload event covers into their own folder"
  on storage.objects for insert with check (
    bucket_id = 'event-covers' and (storage.foldername(name))[1] = auth.uid()::text
  );
