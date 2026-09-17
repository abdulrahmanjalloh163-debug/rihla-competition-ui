import { describe, expect, it } from 'vitest';
import { recalculateWeakness } from '../lib/adaptive/weaknessStatus';
import { determineNextAction } from '../lib/adaptive/engine';
import type { Learner, LearnerState, Weakness } from '../lib/types';

/**
 * Walks through spec §30's exact demo scenario using only the
 * deterministic application logic (no live Claude/Supabase calls —
 * see the live integration report for why) to prove the loop's
 * shape:
 *
 * Stage 1: create learner (Abdulrahman, Intermediate, Writing)
 * Stage 2: diagnostic writing with repeated حروف الجر errors
 * Stage 3: AI detects the errors (simulated fixed output here)
 * Stage 4: after ONE diagnostic, weakness must be 'potential' only
 *          (locked rule) — engine should choose to gather more
 *          evidence, not declare a confirmed weakness yet.
 * Stage 5: engine generates a first practice session targeting the
 *          potential category to gather the 2nd evidence event.
 * Stage 6-7: learner scores badly on that first round.
 * Stage 8: profile updates; weakness now confirmed, matching the
 *          spec's illustrative "45% -> needs_practice, high
 *          priority" numbers.
 * Stage 9: a strong second practice round escalates the next
 *          decision to increased difficulty — the "wow moment".
 *
 * Phase 2 approved architecture (kept, not changed here):
 *   - weaknesses.accuracy stays cumulative long-term accuracy.
 *   - practice_sessions.accuracy_before/accuracy_after are the
 *     per-session snapshots that give Screen 7 its literal
 *     "previous 45% -> current 80%" framing; the cumulative
 *     weaknesses.accuracy is a separate, slower-moving number by
 *     design, not a bug to fix.
 *   - diagnostic_error_count and practice_error_count are tracked
 *     separately (item #2) and summed into error_count for the
 *     confirmation rule, which doesn't care about source.
 */
describe('demo scenario walkthrough (spec §30)', () => {
  const learner: Learner = {
    id: 'demo-learner',
    name: 'Abdulrahman',
    self_reported_level: 'Intermediate',
    learning_goal: 'Writing',
    observed_level: 'Intermediate',
    strengths: [],
    current_focus: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('never confirms a weakness off the first diagnostic alone', () => {
    // Stage 2-3: diagnostic writing has 3 حروف الجر errors detected
    // (استيقظت في الصباح / ذهبت في المسجد / ذهبت في المدرسة all
    // misuse "في" instead of "إلى"). All 3 are diagnostic-sourced.
    const afterDiagnostic = recalculateWeakness({
      category: 'حروف الجر',
      learner_id: learner.id,
      diagnostic_error_count: 3,
      practice_error_count: 0,
      attempt_count: 1, // ONE diagnostic = one evidence event
      relevant_question_count: 0,
      correct_count: 0,
      last_detected: new Date().toISOString(),
    });

    // Locked rule: must stay 'potential', NOT an immediately
    // confirmed weakness, despite hitting the error-count threshold.
    expect(afterDiagnostic.error_count).toBe(3);
    expect(afterDiagnostic.status).toBe('potential');

    const state: LearnerState = {
      learner,
      weaknesses: [{ ...weaknessRow(), ...afterDiagnostic, diagnostic_error_count: 3 }],
    };
    const decision = determineNextAction(state);

    // Engine response to a potential pattern is to monitor / gather
    // more evidence via easy practice — not declare a confirmed
    // high-priority weakness yet.
    expect(decision.action).toBe('monitor');
    expect(decision.category).toBe('حروف الجر');
  });

  it('confirms the weakness once a practice session supplies the 2nd evidence event, matching spec §30 Stage 4 numbers', () => {
    // Stage 5-7: first practice session (5 easy multiple-choice
    // exercises targeting حروف الجر) — learner gets roughly the
    // spec's illustrative 45% first-round performance level: 2/5
    // correct, so 3 wrong answers become practice-sourced errors,
    // on top of the 3 diagnostic errors already on record.
    const afterFirstPractice = recalculateWeakness({
      category: 'حروف الجر',
      learner_id: learner.id,
      diagnostic_error_count: 3,
      practice_error_count: 3, // 3 wrong out of 5 this round
      attempt_count: 2, // diagnostic + this practice session
      relevant_question_count: 5,
      correct_count: 2, // 2/5 = 40%, close to spec's "45%" example
      last_detected: new Date().toISOString(),
    });

    expect(afterFirstPractice.error_count).toBe(6); // sources preserved separately, combined here
    expect(afterFirstPractice.status).toBe('needs_practice');
    expect(afterFirstPractice.priority).toBe('high');
    expect(afterFirstPractice.accuracy).toBeCloseTo(0.4, 5);

    const state: LearnerState = {
      learner,
      weaknesses: [
        { ...weaknessRow(), ...afterFirstPractice, diagnostic_error_count: 3, practice_error_count: 3 },
      ],
    };
    const decision = determineNextAction(state);

    // Confirmed weakness, accuracy < 50% -> Rule C.
    expect(decision.action).toBe('explain_and_practice');
    expect(decision.difficulty).toBe('easy');
  });

  it('Stage 8-9: a strong second round escalates difficulty — the wow moment (per-session snapshot, per approved architecture)', () => {
    // This models practice_sessions.accuracy_after for round 2
    // directly (per-session snapshot), matching the spec's literal
    // "previous 45% -> current 80%" narrative on Screen 7. The
    // cumulative weaknesses.accuracy is a separate, intentionally
    // slower-moving figure (see file header) — both are correct
    // per the approved Phase 2 architecture, they just answer
    // different questions.
    const strongRound: Weakness = {
      ...weaknessRow(),
      category: 'حروف الجر',
      diagnostic_error_count: 3,
      practice_error_count: 4, // 3 (round 1) + 1 (round 2)
      error_count: 7,
      attempt_count: 3,
      relevant_question_count: 10,
      correct_count: 8, // 80%, matching spec's literal example
      accuracy: 0.8,
      status: 'improving',
      priority: 'low',
    };

    const state: LearnerState = { learner, weaknesses: [strongRound] };
    const decision = determineNextAction(state);

    expect(decision.action).toBe('targeted_practice_increase_difficulty');
    expect(decision.difficulty).not.toBe('easy');
  });
});

function weaknessRow(): Weakness {
  return {
    id: 'w1',
    learner_id: 'demo-learner',
    category: 'حروف الجر',
    error_count: 0,
    diagnostic_error_count: 0,
    practice_error_count: 0,
    attempt_count: 0,
    relevant_question_count: 0,
    correct_count: 0,
    accuracy: 0,
    status: 'potential',
    priority: 'medium',
    last_detected: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
