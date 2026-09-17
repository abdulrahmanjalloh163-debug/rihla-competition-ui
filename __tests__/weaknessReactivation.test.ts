import { describe, expect, it } from 'vitest';
import { recalculateWeakness } from '../lib/adaptive/weaknessStatus';
import { determineNextAction } from '../lib/adaptive/engine';
import type {
  Learner,
  LearnerState,
  Weakness,
} from '../lib/types';

const learner: Learner = {
  id: 'learner-decline',
  name: 'Test Learner',
  self_reported_level: 'Intermediate',
  learning_goal: 'Writing',
  observed_level: 'Intermediate',
  strengths: [],
  current_focus: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function baseWeakness(
  overrides: Partial<Weakness>
): Weakness {
  return {
    id: 'w1',
    learner_id: learner.id,
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

describe(
  'weakness reactivation after decline (Rule G)',
  () => {
    it(
      'a mastered category is excluded from the engine while it stays mastered',
      () => {
        const mastered = baseWeakness({
          diagnostic_error_count: 3,
          practice_error_count: 2,
          error_count: 5,
          attempt_count: 3,
          relevant_question_count: 12,
          correct_count: 11,
          accuracy: 0.9166666666666666,
          status: 'mastered',
          priority: 'low',
        });

        const state: LearnerState = {
          learner,
          weaknesses: [mastered],
        };

        expect(
          determineNextAction(state).action
        ).toBe('all_mastered');
      }
    );

    it(
      'a later bad practice session drags a mastered category back to needs_practice/improving and the engine re-selects it',
      () => {
        const priorGoodPerformance = {
          diagnostic_error_count: 3,
          practice_error_count: 1,
          attempt_count: 3,
          relevant_question_count: 12,
          correct_count: 11,
        };

        const declined =
          recalculateWeakness({
            category: 'حروف الجر',
            learner_id: learner.id,
            diagnostic_error_count:
              priorGoodPerformance
                .diagnostic_error_count,
            practice_error_count:
              priorGoodPerformance
                .practice_error_count + 4,
            attempt_count:
              priorGoodPerformance
                .attempt_count + 1,
            relevant_question_count:
              priorGoodPerformance
                .relevant_question_count + 5,
            correct_count:
              priorGoodPerformance
                .correct_count + 1,
            last_detected:
              new Date().toISOString(),
          });

        expect(
          declined.status
        ).not.toBe('mastered');

        expect([
          'needs_practice',
          'improving',
        ]).toContain(
          declined.status
        );

        const reactivated: Weakness = {
          ...baseWeakness({}),
          diagnostic_error_count:
            priorGoodPerformance
              .diagnostic_error_count,
          practice_error_count:
            priorGoodPerformance
              .practice_error_count + 4,
          ...declined,
        };

        const state: LearnerState = {
          learner,
          weaknesses: [reactivated],
        };

        const decision =
          determineNextAction(state);

        expect(
          decision.action
        ).not.toBe('all_mastered');

        expect(
          decision.category
        ).toBe('حروف الجر');
      }
    );

    it(
      'a sharper decline (accuracy < 50%) re-triggers Rule C (explain_and_practice) even from a formerly mastered category',
      () => {
        const sharpDecline =
          recalculateWeakness({
            category:
              'التذكير والتأنيث',
            learner_id:
              learner.id,
            diagnostic_error_count: 3,
            practice_error_count: 8,
            attempt_count: 4,
            relevant_question_count: 20,
            correct_count: 8,
            last_detected:
              new Date().toISOString(),
          });

        expect(
          sharpDecline.status
        ).toBe('needs_practice');

        const reactivated: Weakness = {
          ...baseWeakness({}),
          category:
            'التذكير والتأنيث',
          diagnostic_error_count: 3,
          practice_error_count: 8,
          ...sharpDecline,
        };

        const decision =
          determineNextAction({
            learner,
            weaknesses: [reactivated],
          });

        expect(
          decision.action
        ).toBe(
          'explain_and_practice'
        );

        expect(
          decision.difficulty
        ).toBe('easy');
      }
    );

    it(
      'returns a reactivated needs_practice category to targeted practice even when cumulative accuracy is above 70%',
      () => {
        const reactivated =
          baseWeakness({
            category:
              'التذكير والتأنيث',

            diagnostic_error_count: 2,

            practice_error_count: 1,

            error_count: 3,

            attempt_count: 6,

            relevant_question_count: 20,

            correct_count: 15,

            accuracy: 0.75,

            status:
              'needs_practice',

            priority:
              'medium',
          });

        const decision =
          determineNextAction({
            learner,
            weaknesses: [
              reactivated,
            ],
          });

        expect(
          decision.action
        ).toBe(
          'targeted_practice'
        );

        expect(
          decision.category
        ).toBe(
          'التذكير والتأنيث'
        );

        expect(
          decision.difficulty
        ).toBe('moderate');

        expect(
          decision.reason
        ).toContain(
          'confirmed decline'
        );
      }
    );
  }
);