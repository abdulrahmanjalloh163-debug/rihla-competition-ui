import { getSupabase } from './client';
import type { Exercise, ExerciseAttempt } from '../types';

export interface AnswerSubmission {
  exerciseId: string;
  answer: string;
}

/**
 * Grades and stores answers for a batch of exercises. Correctness is
 * decided by comparing to Exercise.correct_answer in application
 * code — not re-asked of the LLM (spec §29).
 */
export async function submitAnswers(
  learnerId: string,
  exercises: Exercise[],
  submissions: AnswerSubmission[]
): Promise<{ attempts: ExerciseAttempt[]; correctCount: number; total: number }> {
  const exerciseById = new Map(exercises.map((ex) => [ex.id, ex]));

  const rows = submissions.map((s) => {
    const exercise = exerciseById.get(s.exerciseId);
    if (!exercise) {
      throw new Error(`submitAnswers: exercise ${s.exerciseId} not found in provided batch`);
    }
    const isCorrect = normalize(s.answer) === normalize(exercise.correct_answer);
    return {
      exercise_id: s.exerciseId,
      learner_id: learnerId,
      answer: s.answer,
      is_correct: isCorrect,
    };
  });

  const { data, error } = await getSupabase().from('exercise_attempts').insert(rows).select();
  if (error) throw new Error(`submitAnswers failed: ${error.message}`);

  const attempts = (data ?? []) as ExerciseAttempt[];
  const correctCount = attempts.filter((a) => a.is_correct).length;

  return { attempts, correctCount, total: attempts.length };
}

function normalize(text: string): string {
  return text
    .trim()
    .replace(/[\u064B-\u0652]/g, '')
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/[.,!?،؛:؟]/g, '')
    .replace(/\s+/g, ' ');
}
