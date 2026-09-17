import { describe, expect, it } from 'vitest';
import { calculatePriority } from '../lib/adaptive/priority';
import type { Weakness } from '../lib/types';

function weakness(overrides: Partial<Weakness>): Weakness {
  return {
    id: 'w1',
    learner_id: 'learner-1',
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
    ...overrides,
  };
}

describe('calculatePriority', () => {
  it('mastered is always low', () => {
    expect(calculatePriority(weakness({ status: 'mastered', accuracy: 0.99 }))).toBe('low');
  });

  it('no exercise evidence yet defaults to medium', () => {
    expect(
      calculatePriority(weakness({ status: 'potential', relevant_question_count: 0 }))
    ).toBe('medium');
  });

  it('accuracy < 50% is high', () => {
    expect(
      calculatePriority(weakness({ status: 'needs_practice', accuracy: 0.4, relevant_question_count: 5 }))
    ).toBe('high');
  });

  it('accuracy 50-79% is medium', () => {
    expect(
      calculatePriority(weakness({ status: 'needs_practice', accuracy: 0.6, relevant_question_count: 5 }))
    ).toBe('medium');
  });

  it('accuracy >= 80% is low', () => {
    expect(
      calculatePriority(weakness({ status: 'improving', accuracy: 0.85, relevant_question_count: 5 }))
    ).toBe('low');
  });
});
