import { describe, expect, it } from 'vitest';
import { determineNextAction } from '../lib/adaptive/engine';
import type {
  Learner,
  MaintenanceReview,
  Weakness,
} from '../lib/types';

const learner: Learner = {
  id: 'learner-1',
  name: 'Abdulrahman',
  self_reported_level: 'Intermediate',
  learning_goal: 'Writing',
  observed_level: 'Intermediate',
  strengths: [],
  current_focus: null,
  created_at: '2026-09-16T00:00:00.000Z',
  updated_at: '2026-09-16T00:00:00.000Z',
};

function masteredWeakness(
  category: Weakness['category'],
  accuracy = 0.95
): Weakness {
  return {
    id: `weakness-${category}`,
    learner_id: learner.id,
    category,

    error_count: 4,
    diagnostic_error_count: 2,
    practice_error_count: 2,

    attempt_count: 4,

    relevant_question_count: 15,
    correct_count: Math.round(15 * accuracy),
    accuracy,

    status: 'mastered',
    priority: 'low',

    last_detected:
      '2026-09-16T00:00:00.000Z',

    created_at:
      '2026-09-16T00:00:00.000Z',

    updated_at:
      '2026-09-16T00:00:00.000Z',
  };
}

function review(
  category: MaintenanceReview['category'],
  reviewNumber: number,
  accuracy: number,
  signal: boolean,
  createdAt: string
): MaintenanceReview {
  return {
    id: `review-${category}-${reviewNumber}`,
    learner_id: learner.id,
    category,
    review_number: reviewNumber,
    total_questions: 5,
    correct_count: Math.round(
      accuracy * 5
    ),
    accuracy,
    reactivation_signal: signal,
    created_at: createdAt,
  };
}

const masteredWeaknesses: Weakness[] = [
  masteredWeakness('حروف الجر'),
  masteredWeakness(
    'التذكير والتأنيث'
  ),
  masteredWeakness('المفرد والجمع'),
];

describe('maintenance review adaptive logic', () => {
  it('starts maintenance when all categories are mastered', () => {
    const decision =
      determineNextAction({
        learner,
        weaknesses:
          masteredWeaknesses,
        maintenanceReviews: [],
      });

    expect(decision.action).toBe(
      'maintenance_review'
    );

    expect(decision.category).toBe(
      'حروف الجر'
    );

    expect(decision.status).toBe(
      'mastered'
    );
  });

  it('reviews the same category again after one decline signal', () => {
    const maintenanceReviews: MaintenanceReview[] =
      [
        review(
          'حروف الجر',
          1,
          0.6,
          true,
          '2026-09-16T10:00:00.000Z'
        ),
      ];

    const decision =
      determineNextAction({
        learner,
        weaknesses:
          masteredWeaknesses,
        maintenanceReviews,
      });

    expect(decision.action).toBe(
      'maintenance_review'
    );

    expect(decision.category).toBe(
      'حروف الجر'
    );

    expect(decision.reason).toContain(
      'possible decline'
    );
  });

  it('rotates to a category with fewer maintenance reviews', () => {
    const maintenanceReviews: MaintenanceReview[] =
      [
        review(
          'حروف الجر',
          1,
          1,
          false,
          '2026-09-16T10:00:00.000Z'
        ),
      ];

    const decision =
      determineNextAction({
        learner,
        weaknesses:
          masteredWeaknesses,
        maintenanceReviews,
      });

    expect(decision.action).toBe(
      'maintenance_review'
    );

    expect(decision.category).toBe(
      'التذكير والتأنيث'
    );
  });

  it('keeps old all-mastered behavior when maintenance history is not supplied', () => {
    const decision =
      determineNextAction({
        learner,
        weaknesses:
          masteredWeaknesses,
      });

    expect(decision.action).toBe(
      'all_mastered'
    );

    expect(decision.category).toBeNull();
  });it('repeats the same category after a borderline maintenance result', () => {
  const maintenanceReviews: MaintenanceReview[] = [
    review(
      'حروف الجر',
      1,
      0.8,
      false,
      '2026-09-16T10:00:00.000Z'
    ),
  ];

  const decision =
    determineNextAction({
      learner,
      weaknesses:
        masteredWeaknesses,
      maintenanceReviews,
    });

  expect(
    decision.action
  ).toBe(
    'maintenance_review'
  );

  expect(
    decision.category
  ).toBe(
    'حروف الجر'
  );

  expect(
    decision.reason
  ).toContain(
    '80%'
  );
});
});