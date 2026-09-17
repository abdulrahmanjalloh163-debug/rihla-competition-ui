-- Reproducibility migration for maintenance-review support.
-- Safe to run against databases where these objects already exist.

create table if not exists maintenance_reviews (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references learners(id) on delete cascade,
  category text not null,
  review_number integer not null default 1,
  total_questions integer not null default 0,
  correct_count integer not null default 0,
  accuracy numeric not null default 0,
  reactivation_signal boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists maintenance_reviews_learner_category_idx
  on maintenance_reviews (learner_id, category);

alter table maintenance_reviews enable row level security;

alter table practice_sessions
  add column if not exists session_type text not null default 'adaptive_practice';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'practice_sessions_session_type_check'
  ) then
    alter table practice_sessions
      add constraint practice_sessions_session_type_check
      check (session_type in ('adaptive_practice', 'maintenance_review'));
  end if;
end
$$;
