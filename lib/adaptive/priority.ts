import { ADAPTIVE_THRESHOLDS } from './thresholds';
import type { Priority, Weakness } from '../types';

/**
 * Deterministic priority model (spec §13).
 *
 * - Mastered categories are always low priority.
 * - Categories with no exercise evidence yet (relevant_question_count
 *   === 0) — i.e. still 'potential' or freshly confirmed — default to
 *   'medium' so the engine still explores them, without treating them
 *   as urgent before any exercise-based evidence exists.
 * - Otherwise priority follows exercise accuracy:
 *     accuracy < HIGH_PRIORITY_ACCURACY        -> high
 *     accuracy < LOW_PRIORITY_ACCURACY         -> medium
 *     accuracy >= LOW_PRIORITY_ACCURACY        -> low
 */
export function calculatePriority(weakness: Weakness): Priority {
  if (weakness.status === 'mastered') return 'low';

  if (weakness.relevant_question_count === 0) {
    return 'medium';
  }

  if (weakness.accuracy < ADAPTIVE_THRESHOLDS.HIGH_PRIORITY_ACCURACY) {
    return 'high';
  }
  if (weakness.accuracy < ADAPTIVE_THRESHOLDS.LOW_PRIORITY_ACCURACY) {
    return 'medium';
  }
  return 'low';
}
