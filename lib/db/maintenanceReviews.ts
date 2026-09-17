import { getSupabase } from './client';
import { ADAPTIVE_THRESHOLDS } from '../adaptive/thresholds';
import type {
  CoreCategory,
  MaintenanceReview,
} from '../types';

/**
 * Get all maintenance reviews for a learner.
 */
export async function getMaintenanceReviewsForLearner(
  learnerId: string
): Promise<MaintenanceReview[]> {
  const { data, error } = await getSupabase()
    .from('maintenance_reviews')
    .select('*')
    .eq('learner_id', learnerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(
      `getMaintenanceReviewsForLearner failed: ${error.message}`
    );
  }

  return (data ?? []) as MaintenanceReview[];
}

/**
 * Get maintenance reviews for one learner/category.
 */
export async function getMaintenanceReviewsForCategory(
  learnerId: string,
  category: CoreCategory
): Promise<MaintenanceReview[]> {
  const { data, error } = await getSupabase()
    .from('maintenance_reviews')
    .select('*')
    .eq('learner_id', learnerId)
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(
      `getMaintenanceReviewsForCategory failed: ${error.message}`
    );
  }

  return (data ?? []) as MaintenanceReview[];
}

/**
 * Get the next review number for a learner/category.
 */
async function getNextReviewNumber(
  learnerId: string,
  category: CoreCategory
): Promise<number> {
  const reviews =
    await getMaintenanceReviewsForCategory(
      learnerId,
      category
    );

  if (reviews.length === 0) {
    return 1;
  }

  return (
    Math.max(
      ...reviews.map(
        (review) => review.review_number
      )
    ) + 1
  );
}

/**
 * Save one completed maintenance review.
 *
 * A review below the reactivation threshold creates a decline
 * signal. It does not itself reactivate the weakness.
 */
export async function recordMaintenanceReview(
  learnerId: string,
  category: CoreCategory,
  result: {
    totalQuestions: number;
    correctCount: number;
  }
): Promise<MaintenanceReview> {
  if (result.totalQuestions <= 0) {
    throw new Error(
      'recordMaintenanceReview: totalQuestions must be greater than 0'
    );
  }

  if (
    result.correctCount < 0 ||
    result.correctCount >
      result.totalQuestions
  ) {
    throw new Error(
      'recordMaintenanceReview: correctCount must be between 0 and totalQuestions'
    );
  }

  const accuracy =
    result.correctCount /
    result.totalQuestions;

  const reactivationSignal =
    accuracy <
    ADAPTIVE_THRESHOLDS
      .MAINTENANCE_REACTIVATION_ACCURACY;

  const reviewNumber =
    await getNextReviewNumber(
      learnerId,
      category
    );

  const { data, error } =
    await getSupabase()
      .from('maintenance_reviews')
      .insert({
        learner_id: learnerId,
        category,
        review_number: reviewNumber,
        total_questions:
          result.totalQuestions,
        correct_count:
          result.correctCount,
        accuracy,
        reactivation_signal:
          reactivationSignal,
      })
      .select()
      .single();

  if (error) {
    throw new Error(
      `recordMaintenanceReview failed: ${error.message}`
    );
  }

  return data as MaintenanceReview;
}

/**
 * Count consecutive recent maintenance reviews that produced
 * a reactivation signal.
 *
 * The count stops as soon as a review does not produce a
 * reactivation signal.
 */
export async function countConsecutiveDeclineSignals(
  learnerId: string,
  category: CoreCategory
): Promise<number> {
  const reviews =
    await getMaintenanceReviewsForCategory(
      learnerId,
      category
    );

  let count = 0;

  for (const review of reviews) {
    if (!review.reactivation_signal) {
      break;
    }

    count += 1;
  }

  return count;
}