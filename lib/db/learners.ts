import { getSupabase } from './client';
import type { ArabicLevel, Learner, LearningGoal } from '../types';

export async function createLearner(input: {
  name: string;
  self_reported_level: ArabicLevel;
  learning_goal: LearningGoal;
}): Promise<Learner> {
  const { data, error } = await getSupabase()
    .from('learners')
    .insert({
      name: input.name,
      self_reported_level: input.self_reported_level,
      learning_goal: input.learning_goal,
      observed_level: input.self_reported_level, // conservative starting point (spec §9)
    })
    .select()
    .single();

  if (error) throw new Error(`createLearner failed: ${error.message}`);
  return data as Learner;
}

export async function getLearner(learnerId: string): Promise<Learner> {
  const { data, error } = await getSupabase()
    .from('learners')
    .select('*')
    .eq('id', learnerId)
    .single();

  if (error) throw new Error(`getLearner failed: ${error.message}`);
  return data as Learner;
}

export async function updateLearnerFocus(
  learnerId: string,
  currentFocus: string | null
): Promise<void> {
  const { error } = await getSupabase()
    .from('learners')
    .update({ current_focus: currentFocus, updated_at: new Date().toISOString() })
    .eq('id', learnerId);

  if (error) throw new Error(`updateLearnerFocus failed: ${error.message}`);
}
