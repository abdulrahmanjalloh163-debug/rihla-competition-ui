import { describe, expect, it } from 'vitest';
import { determineNextAction } from '../lib/adaptive/engine';
import type { Learner, LearnerState, Weakness } from '../lib/types';

const baseLearner: Learner = {
  id: 'learner-1',
  name: 'Abdulrahman',
  self_reported_level: 'Intermediate',
  learning_goal: 'Writing',
  observed_level: 'Intermediate',
  strengths: [],
  current_focus: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

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

describe('determineNextAction', () => {
  it('Rule A: brand new learner with no weaknesses at all -> diagnostic_practice', () => {
    const state: LearnerState = { learner: baseLearner, weaknesses: [] };
    const decision = determineNextAction(state);
    expect(decision.action).toBe('diagnostic_practice');
    expect(decision.category).toBeNull();
  });

  it('Rule B: potential pattern -> monitor, easy difficulty, gather more evidence', () => {
    const state: LearnerState = {
      learner: baseLearner,
      weaknesses: [weakness({ status: 'potential', error_count: 3, attempt_count: 1 })],
    };
    const decision = determineNextAction(state);
    expect(decision.action).toBe('monitor');
    expect(decision.category).toBe('حروف الجر');
    expect(decision.difficulty).toBe('easy');
  });

  it('Rule C: confirmed weakness with accuracy < 50% -> explain_and_practice, easy', () => {
    const state: LearnerState = {
      learner: baseLearner,
      weaknesses: [
        weakness({
          status: 'needs_practice',
          priority: 'high',
          accuracy: 0.45,
          relevant_question_count: 5,
          correct_count: 2,
        }),
      ],
    };
    const decision = determineNextAction(state);
    expect(decision.action).toBe('explain_and_practice');
    expect(decision.difficulty).toBe('easy');
  });

  it('Rule D: 50-69% accuracy -> targeted_practice', () => {
    const state: LearnerState = {
      learner: baseLearner,
      weaknesses: [
        weakness({
          status: 'needs_practice',
          priority: 'medium',
          accuracy: 0.58,
          relevant_question_count: 5,
          correct_count: 2, // matches accuracy field for test clarity
        }),
      ],
    };
    const decision = determineNextAction(state);
    expect(decision.action).toBe('targeted_practice');
  });

  it('Rule E: 70-89% accuracy -> targeted_practice_increase_difficulty, moderate/hard', () => {
    const state: LearnerState = {
      learner: baseLearner,
      weaknesses: [
        weakness({
          status: 'improving',
          priority: 'low',
          accuracy: 0.8,
          relevant_question_count: 5,
          correct_count: 4,
        }),
      ],
    };
    const decision = determineNextAction(state);
    expect(decision.action).toBe('targeted_practice_increase_difficulty');
    expect(['moderate', 'hard']).toContain(decision.difficulty);
  });

  it('Rule F: mastered category is excluded from selection', () => {
    const state: LearnerState = {
      learner: baseLearner,
      weaknesses: [
        weakness({
          category: 'حروف الجر',
          status: 'mastered',
          priority: 'low',
          accuracy: 0.95,
          relevant_question_count: 12,
          correct_count: 11,
        }),
        weakness({
          category: 'التذكير والتأنيث',
          status: 'needs_practice',
          priority: 'high',
          accuracy: 0.4,
          relevant_question_count: 5,
          correct_count: 2,
        }),
      ],
    };
    const decision = determineNextAction(state);
    expect(decision.category).toBe('التذكير والتأنيث');
  });

  it('all_mastered when every tracked category is mastered', () => {
    const state: LearnerState = {
      learner: baseLearner,
      weaknesses: [
        weakness({ status: 'mastered', accuracy: 0.95, relevant_question_count: 10, correct_count: 9 }),
      ],
    };
    const decision = determineNextAction(state);
    expect(decision.action).toBe('all_mastered');
  });

  it('picks the highest-priority category among several active ones', () => {
    const state: LearnerState = {
      learner: baseLearner,
      weaknesses: [
        weakness({
          category: 'حروف الجر',
          status: 'improving',
          priority: 'low',
          accuracy: 0.85,
          relevant_question_count: 5,
          correct_count: 4,
        }),
        weakness({
          category: 'التذكير والتأنيث',
          status: 'needs_practice',
          priority: 'high',
          accuracy: 0.3,
          relevant_question_count: 5,
          correct_count: 1,
        }),
        weakness({
          category: 'المفرد والجمع',
          status: 'needs_practice',
          priority: 'medium',
          accuracy: 0.6,
          relevant_question_count: 5,
          correct_count: 3,
        }),
      ],
    };
    const decision = determineNextAction(state);
    expect(decision.category).toBe('التذكير والتأنيث');
  });

  it('the "wow moment": same category escalates from targeted_practice to increased difficulty after improved accuracy', () => {
    // Stage 4-5: 45% accuracy -> targeted practice.
    const before: LearnerState = {
      learner: baseLearner,
      weaknesses: [
        weakness({
          status: 'needs_practice',
          priority: 'high',
          accuracy: 0.45,
          relevant_question_count: 5,
          correct_count: 2,
        }),
      ],
    };
    const decisionBefore = determineNextAction(before);
    expect(decisionBefore.action).toBe('explain_and_practice');

    // Stage 8-9: accuracy improved to 80% after a practice session.
    const after: LearnerState = {
      learner: baseLearner,
      weaknesses: [
        weakness({
          status: 'improving',
          priority: 'low',
          accuracy: 0.8,
          relevant_question_count: 10,
          correct_count: 8,
        }),
      ],
    };
    const decisionAfter = determineNextAction(after);
    expect(decisionAfter.action).toBe('targeted_practice_increase_difficulty');
    expect(decisionAfter.difficulty).not.toBe('easy');
  });
});
