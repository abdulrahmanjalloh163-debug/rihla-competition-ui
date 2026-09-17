import { describe, expect, it } from 'vitest';
import { deriveWeaknessStatus, recalculateWeakness, computeAccuracy } from '../lib/adaptive/weaknessStatus';

describe('deriveWeaknessStatus', () => {
  it('stays potential after a single diagnostic with 3+ errors (locked rule #7)', () => {
    // One diagnostic attempt, 3 errors detected in one category.
    // Must NOT be confirmed as a weakness yet — only 1 evidence event.
    const status = deriveWeaknessStatus({
      error_count: 3,
      attempt_count: 1,
      relevant_question_count: 0,
      correct_count: 0,
    });
    expect(status).toBe('potential');
  });

  it('stays potential with 2 attempts but fewer than 3 errors', () => {
    const status = deriveWeaknessStatus({
      error_count: 2,
      attempt_count: 2,
      relevant_question_count: 0,
      correct_count: 0,
    });
    expect(status).toBe('potential');
  });

  it('confirms as needs_practice once 3+ errors across 2+ attempts with no exercise evidence', () => {
    const status = deriveWeaknessStatus({
      error_count: 3,
      attempt_count: 2,
      relevant_question_count: 0,
      correct_count: 0,
    });
    expect(status).toBe('needs_practice');
  });

  it('confirmed + low exercise accuracy => needs_practice', () => {
    const status = deriveWeaknessStatus({
      error_count: 5,
      attempt_count: 2,
      relevant_question_count: 5,
      correct_count: 2, // 40%
    });
    expect(status).toBe('needs_practice');
  });

  it('confirmed + 70-89% accuracy => improving', () => {
    const status = deriveWeaknessStatus({
      error_count: 4,
      attempt_count: 2,
      relevant_question_count: 5,
      correct_count: 4, // 80%
    });
    expect(status).toBe('improving');
  });

  it('confirmed + >=90% accuracy but <10 questions => improving, not mastered', () => {
    const status = deriveWeaknessStatus({
      error_count: 3,
      attempt_count: 2,
      relevant_question_count: 5,
      correct_count: 5, // 100% but only 5 questions
    });
    expect(status).toBe('improving');
  });

  it('confirmed + >=90% accuracy and >=10 questions => mastered', () => {
    const status = deriveWeaknessStatus({
      error_count: 3,
      attempt_count: 3,
      relevant_question_count: 10,
      correct_count: 9, // 90%
    });
    expect(status).toBe('mastered');
  });

  it('Rule G: a previously-mastered category reverts on decline (pure re-derivation)', () => {
    // Simulate accumulated state that used to be mastered, then a
    // bad session drags relevant_question_count/correct_count so
    // accuracy falls back under the improving threshold.
    const declined = deriveWeaknessStatus({
      error_count: 8,
      attempt_count: 4,
      relevant_question_count: 15,
      correct_count: 6, // 40%
    });
    expect(declined).toBe('needs_practice');
  });
});

describe('computeAccuracy', () => {
  it('returns 0 when no questions answered yet', () => {
    expect(computeAccuracy(0, 0)).toBe(0);
  });

  it('divides correct by total', () => {
    expect(computeAccuracy(4, 5)).toBe(0.8);
  });
});

describe('recalculateWeakness', () => {
  it('derives error_count (sum of sources), accuracy, status, and priority together', () => {
    const result = recalculateWeakness({
      category: 'حروف الجر',
      learner_id: 'learner-1',
      diagnostic_error_count: 3,
      practice_error_count: 0,
      attempt_count: 2,
      relevant_question_count: 5,
      correct_count: 1, // 20%
      last_detected: new Date().toISOString(),
    });
    expect(result.error_count).toBe(3);
    expect(result.accuracy).toBe(0.2);
    expect(result.status).toBe('needs_practice');
    expect(result.priority).toBe('high');
  });

  it('Phase 2 item #2: combines diagnostic + practice error sources into one confirmed error_count', () => {
    const result = recalculateWeakness({
      category: 'حروف الجر',
      learner_id: 'learner-1',
      diagnostic_error_count: 3, // from the diagnostic
      practice_error_count: 2, // from wrong exercise answers
      attempt_count: 2,
      relevant_question_count: 5,
      correct_count: 3,
      last_detected: new Date().toISOString(),
    });
    expect(result.error_count).toBe(5);
    // confirmed (5 >= 3 errors, 2 >= 2 attempts) and 60% accuracy -> needs_practice
    expect(result.status).toBe('needs_practice');
  });

  it('locked rule re-verified post-split: one diagnostic alone (even with 3 diagnostic errors) stays potential', () => {
    const result = recalculateWeakness({
      category: 'حروف الجر',
      learner_id: 'learner-1',
      diagnostic_error_count: 3,
      practice_error_count: 0,
      attempt_count: 1, // only one evidence event so far
      relevant_question_count: 0,
      correct_count: 0,
      last_detected: new Date().toISOString(),
    });
    expect(result.error_count).toBe(3);
    expect(result.status).toBe('potential');
  });
});
