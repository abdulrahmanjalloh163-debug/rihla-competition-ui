-- Phase 2 item #2: preserve the distinction between diagnostic
-- (AI-detected, free-text) errors and practice (incorrect exercise
-- answer) errors, while keeping the combined error_count used by
-- the weakness-confirmation rule (spec §11: 3+ errors / 2+ attempts,
-- regardless of source).

alter table weaknesses
  add column if not exists diagnostic_error_count int not null default 0,
  add column if not exists practice_error_count int not null default 0;

-- Conservative backfill for any pre-existing rows: attribute
-- existing error_count to the diagnostic source, since that was the
-- only source the pre-Phase-2 code ever wrote to. Safe to skip on a
-- fresh database (no rows yet).
update weaknesses
  set diagnostic_error_count = error_count
  where diagnostic_error_count = 0
    and practice_error_count = 0
    and error_count > 0;

-- Replace the plain error_count column with a generated column that
-- is always the sum of the two sources, so application code never
-- writes it directly and it can't drift out of sync.
alter table weaknesses drop column error_count;
alter table weaknesses
  add column error_count integer
  generated always as (diagnostic_error_count + practice_error_count) stored;
