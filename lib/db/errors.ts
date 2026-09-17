import { getSupabase } from './client';
import type { CoreCategory, DetectedError, ErrorCategory } from '../types';
import type { DetectedErrorFromAI } from '../ai/schemas/analysis';

export async function saveErrors(
  learnerId: string,
  attemptId: string,
  errors: DetectedErrorFromAI[]
): Promise<DetectedError[]> {
  if (errors.length === 0) return [];

  const rows = errors.map((e) => ({
    learner_id: learnerId,
    attempt_id: attemptId,
    category: e.category as ErrorCategory,
    original_text: e.original_text,
    correction: e.correction,
    explanation_ar: e.explanation_ar,
    explanation_en: e.explanation_en,
    confidence: e.confidence,
  }));

  const { data, error } = await getSupabase().from('errors').insert(rows).select();

  if (error) throw new Error(`saveErrors failed: ${error.message}`);
  return data as DetectedError[];
}

/**
 * Count of errors per core category (Other is excluded — spec §7:
 * "it should NOT use unrelated errors to determine the learner's
 * core weakness").
 */
export async function countErrorsByCategory(
  learnerId: string
): Promise<Record<CoreCategory, number>> {
  const { data, error } = await getSupabase()
    .from('errors')
    .select('category')
    .eq('learner_id', learnerId)
    .neq('category', 'Other');

  if (error) throw new Error(`countErrorsByCategory failed: ${error.message}`);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.category] = (counts[row.category] ?? 0) + 1;
  }
  return counts as Record<CoreCategory, number>;
}

/**
 * Recent original_text examples for a category, fed to the exercise
 * generator as context (spec §14 previous_errors field).
 */
export async function getRecentErrorTexts(
  learnerId: string,
  category: CoreCategory,
  limit = 5
): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from('errors')
    .select('original_text, created_at')
    .eq('learner_id', learnerId)
    .eq('category', category)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getRecentErrorTexts failed: ${error.message}`);
  return (data ?? []).map((row) => row.original_text as string);
}
