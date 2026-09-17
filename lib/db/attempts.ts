import { getSupabase } from './client';
import type { Attempt } from '../types';

export async function createAttempt(learnerId: string, inputText: string): Promise<Attempt> {
  const { data, error } = await getSupabase()
    .from('attempts')
    .insert({ learner_id: learnerId, input_text: inputText })
    .select()
    .single();

  if (error) throw new Error(`createAttempt failed: ${error.message}`);
  return data as Attempt;
}

export async function countAttemptsForLearner(learnerId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from('attempts')
    .select('*', { count: 'exact', head: true })
    .eq('learner_id', learnerId);

  if (error) throw new Error(`countAttemptsForLearner failed: ${error.message}`);
  return count ?? 0;
}
