import { ADAPTIVE_THRESHOLDS } from './thresholds';
import { calculatePriority } from './priority';
import type { Weakness, WeaknessStatus } from '../types';

/**
 * Given a weakness row's current counters, derive its status.
 *
 * Locked rule (clarification #7): one diagnostic attempt showing 3
 * errors in a category is NOT enough to confirm a weakness. A
 * weakness is only "confirmed" (i.e. can be needs_practice /
 * improving / mastered) once BOTH:
 *   error_count   >= MIN_WEAKNESS_ERRORS   (3)
 *   attempt_count >= MIN_WEAKNESS_ATTEMPTS (2)
 * are true. "attempt_count" counts distinct evidence events — the
 * one diagnostic submission and/or each completed practice session —
 * not individual exercises.
 *
 * Until confirmed, the category is normally 'potential': a pattern
 * the engine should monitor and gather more evidence on.
 *
 * However, a potential weakness must not stay under observation
 * forever when repeated practice strongly disproves it. If the learner
 * reaches the normal mastery evidence threshold (>=90% accuracy across
 * >=10 relevant questions), the category is resolved as mastered even
 * if the original diagnostic error count never reached 3.
 *
 * Once confirmed, status is driven by exercise-based accuracy
 * (relevant_question_count / correct_count), per spec §11:
 *   accuracy < 70%                                  -> needs_practice
 *   70% <= accuracy < 90%                           -> improving
 *   accuracy >= 90% AND relevant_question_count>=10 -> mastered
 *
 * Rule G (decline): this function is pure and re-derives status from
 * current counters every time it's called, so a previously mastered
 * category naturally falls back to improving/needs_practice if later
 * accuracy drops — no special-case "un-mastering" logic needed.
 */
export function deriveWeaknessStatus(
  counters: Pick<
    Weakness,
    'error_count' | 'attempt_count' | 'relevant_question_count' | 'correct_count'
  >
): WeaknessStatus {
  const {
    MIN_WEAKNESS_ERRORS,
    MIN_WEAKNESS_ATTEMPTS,
    MASTERY_ACCURACY,
    MASTERY_MIN_QUESTIONS,
    IMPROVING_ACCURACY,
  } = ADAPTIVE_THRESHOLDS;

  const accuracy = computeAccuracy(
    counters.correct_count,
    counters.relevant_question_count
  );

  const hasStrongDisconfirmingEvidence =
    accuracy >= MASTERY_ACCURACY &&
    counters.relevant_question_count >= MASTERY_MIN_QUESTIONS;

  const confirmed =
    counters.error_count >= MIN_WEAKNESS_ERRORS &&
    counters.attempt_count >= MIN_WEAKNESS_ATTEMPTS;

  if (!confirmed) {
    return hasStrongDisconfirmingEvidence ? 'mastered' : 'potential';
  }

  if (hasStrongDisconfirmingEvidence) {
    return 'mastered';
  }

  if (accuracy >= IMPROVING_ACCURACY) {
    return 'improving';
  }

  return 'needs_practice';
}

export function computeAccuracy(correctCount: number, relevantQuestionCount: number): number {
  if (relevantQuestionCount === 0) return 0;
  return correctCount / relevantQuestionCount;
}

/**
 * Recompute the full derived fields (error_count, accuracy, status,
 * priority) for a weakness row given its raw counters. Application
 * logic only — never delegated to the LLM (spec §12, §29).
 *
 * error_count is derived here as diagnostic_error_count +
 * practice_error_count (Phase 2 item #2) so callers never need to
 * track the combined total separately — and in Postgres the same
 * sum is enforced by a generated column, so the two can't drift.
 */
export function recalculateWeakness(
  base: Pick<
    Weakness,
    | 'category'
    | 'learner_id'
    | 'diagnostic_error_count'
    | 'practice_error_count'
    | 'attempt_count'
    | 'relevant_question_count'
    | 'correct_count'
    | 'last_detected'
  >
): Pick<Weakness, 'error_count' | 'accuracy' | 'status' | 'priority'> {
  const error_count = base.diagnostic_error_count + base.practice_error_count;
  const accuracy = computeAccuracy(base.correct_count, base.relevant_question_count);
  const status = deriveWeaknessStatus({
    error_count,
    attempt_count: base.attempt_count,
    relevant_question_count: base.relevant_question_count,
    correct_count: base.correct_count,
  });
  const priority = calculatePriority({
    ...base,
    error_count,
    accuracy,
    status,
  } as Weakness);

  return { error_count, accuracy, status, priority };
}
