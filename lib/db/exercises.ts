import { getSupabase } from './client';
import type {
  CoreCategory,
  Difficulty,
  Exercise,
  PracticeSession,
  PracticeSessionType,
} from '../types';
import type { GeneratedExercise } from '../ai/schemas/exercises';

export async function createPracticeSession(input: {
  learnerId: string;
  category: CoreCategory;
  difficulty: Difficulty;
  accuracyBefore: number;
  sessionType?: PracticeSessionType;
}): Promise<PracticeSession> {
  const { data, error } = await getSupabase()
    .from('practice_sessions')
    .insert({
      learner_id: input.learnerId,
      weakness_category: input.category,
      difficulty: input.difficulty,
      accuracy_before: input.accuracyBefore,
      session_type:
        input.sessionType ?? 'adaptive_practice',
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `createPracticeSession failed: ${error.message}`
    );
  }

  return data as PracticeSession;
}

export async function getPracticeSession(
  practiceSessionId: string
): Promise<PracticeSession> {
  const { data, error } = await getSupabase()
    .from('practice_sessions')
    .select('*')
    .eq('id', practiceSessionId)
    .single();

  if (error) {
    throw new Error(
      `getPracticeSession failed: ${error.message}`
    );
  }

  return data as PracticeSession;
}

export async function saveExercises(
  learnerId: string,
  practiceSessionId: string,
  exercises: GeneratedExercise[]
): Promise<Exercise[]> {
  const rows = exercises.map((ex) => ({
    learner_id: learnerId,
    practice_session_id: practiceSessionId,
    weakness_category: ex.target_category,
    difficulty: ex.difficulty,
    exercise_type: ex.exercise_type,
    instruction_ar: ex.instruction_ar,
    question: ex.question,
    options: ex.options ?? null,
    correct_answer: ex.correct_answer,
    explanation_ar: ex.explanation_ar,
  }));

  const { data, error } = await getSupabase()
    .from('exercises')
    .insert(rows)
    .select();

  if (error) {
    throw new Error(
      `saveExercises failed: ${error.message}`
    );
  }

  return data as Exercise[];
}

export async function getExercisesForSession(
  practiceSessionId: string
): Promise<Exercise[]> {
  const { data, error } = await getSupabase()
    .from('exercises')
    .select('*')
    .eq(
      'practice_session_id',
      practiceSessionId
    );

  if (error) {
    throw new Error(
      `getExercisesForSession failed: ${error.message}`
    );
  }

  return (data ?? []) as Exercise[];
}

export async function completePracticeSession(
  practiceSessionId: string,
  input: {
    score: number;
    accuracyAfter: number;
  }
): Promise<PracticeSession> {
  const { data, error } = await getSupabase()
    .from('practice_sessions')
    .update({
      score: input.score,
      accuracy_after: input.accuracyAfter,
      completed_at: new Date().toISOString(),
    })
    .eq('id', practiceSessionId)
    .select()
    .single();

  if (error) {
    throw new Error(
      `completePracticeSession failed: ${error.message}`
    );
  }

  return data as PracticeSession;
}