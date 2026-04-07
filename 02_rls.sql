-- ══════════════════════════════════════════════════════════════════════
--  KIVU — ROW LEVEL SECURITY (RLS)
--  Run AFTER 01_schema.sql
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
--  CLINIC MODULE
-- ─────────────────────────────────────────────

alter table clinic_applications enable row level security;
alter table clinics              enable row level security;
alter table clinic_reviews       enable row level security;
alter table clinic_doctors       enable row level security;

-- clinic_applications: anyone can INSERT (submit a listing)
create policy "public can submit clinic application"
on clinic_applications for insert
to anon, authenticated
with check (true);

-- clinic_applications: only service_role (your backend/admin) can SELECT/UPDATE
create policy "service role reads applications"
on clinic_applications for select
to service_role
using (true);

create policy "service role updates applications"
on clinic_applications for update
to service_role
using (true);

-- clinics: anyone can read live clinics
create policy "public reads live clinics"
on clinics for select
to anon, authenticated
using (true);

-- clinics: only service_role can insert/update/delete (admin approve flow)
create policy "service role manages clinics"
on clinics for all
to service_role
using (true);

-- clinic_reviews: anyone can read
create policy "public reads clinic reviews"
on clinic_reviews for select
to anon, authenticated
using (true);

-- clinic_reviews: anyone can insert
create policy "public submits clinic review"
on clinic_reviews for insert
to anon, authenticated
with check (true);

-- clinic_doctors: anyone can read
create policy "public reads clinic doctors"
on clinic_doctors for select
to anon, authenticated
using (true);

-- clinic_doctors: only service_role can manage
create policy "service role manages doctors"
on clinic_doctors for all
to service_role
using (true);


-- ─────────────────────────────────────────────
--  DATING MODULE
-- ─────────────────────────────────────────────

alter table match_profiles  enable row level security;
alter table match_swipes    enable row level security;
alter table match_matches   enable row level security;
alter table match_messages  enable row level security;
alter table match_presence  enable row level security;

-- profiles: authenticated users can read all active profiles
create policy "auth users read active profiles"
on match_profiles for select
to authenticated
using (is_active = true);

-- profiles: user owns their own row
create policy "user manages own profile"
on match_profiles for all
to authenticated
using  (auth.uid() = id)
with check (auth.uid() = id);

-- swipes: user can only insert their own swipes
create policy "user inserts own swipes"
on match_swipes for insert
to authenticated
with check (auth.uid() = swiper_id);

-- swipes: user can read their own swipes (to know who they already swiped)
create policy "user reads own swipes"
on match_swipes for select
to authenticated
using (auth.uid() = swiper_id);

-- matches: user can read matches they are part of
create policy "user reads own matches"
on match_matches for select
to authenticated
using (auth.uid() = user_a or auth.uid() = user_b);

-- messages: user can read messages in their matches
create policy "user reads match messages"
on match_messages for select
to authenticated
using (
    exists (
        select 1 from match_matches m
        where m.id = match_messages.match_id
          and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
);

-- messages: user can insert messages in their matches
create policy "user sends message in own match"
on match_messages for insert
to authenticated
with check (
    auth.uid() = sender_id
    and exists (
        select 1 from match_matches m
        where m.id = match_messages.match_id
          and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
);

-- messages: user can mark their received messages as read
create policy "user marks messages read"
on match_messages for update
to authenticated
using (
    sender_id != auth.uid()
    and exists (
        select 1 from match_matches m
        where m.id = match_messages.match_id
          and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
);

-- presence: user can upsert own presence
create policy "user upserts own presence"
on match_presence for all
to authenticated
using  (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- presence: authenticated users can read all presence (for online dots)
create policy "auth users read presence"
on match_presence for select
to authenticated
using (true);
