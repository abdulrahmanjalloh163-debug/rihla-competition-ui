import { ADAPTIVE_THRESHOLDS } from './thresholds';
import { CORE_CATEGORIES } from '../types';

import type {
  AdaptiveDecision,
  CoreCategory,
  Difficulty,
  LearnerState,
  MaintenanceReview,
  Weakness,
} from '../types';

const PRIORITY_RANK: Record<
  Weakness['priority'],
  number
> = {
  high: 0,
  medium: 1,
  low: 2,
};

const CATEGORY_RANK: Record<
  CoreCategory,
  number
> = {
  [CORE_CATEGORIES[0]]: 0,
  [CORE_CATEGORIES[1]]: 1,
  [CORE_CATEGORIES[2]]: 2,
};

export function determineNextAction(
  state: LearnerState
): AdaptiveDecision {
  const {
    weaknesses,
    maintenanceReviews,
  } = state;

  if (weaknesses.length === 0) {
    return {
      action: 'diagnostic_practice',
      category: null,
      difficulty: null,
      status: null,
      priority: null,
      reason:
        'No evidence yet for this learner — run the diagnostic first.',
    };
  }

  const active = weaknesses.filter(
    (weakness) =>
      weakness.status !== 'mastered'
  );

  if (active.length === 0) {
    /*
     * Backward compatibility:
     *
     * Callers/tests that have not yet supplied maintenance
     * history continue to receive all_mastered.
     *
     * Once maintenanceReviews is supplied, the engine
     * enters the maintenance cycle.
     */
    if (!maintenanceReviews) {
      return {
        action: 'all_mastered',
        category: null,
        difficulty: null,
        status: 'mastered',
        priority: 'low',
        reason:
          'All tracked categories are currently mastered.',
      };
    }

    return determineMaintenanceAction(
      weaknesses,
      maintenanceReviews
    );
  }

  const chosen = [...active].sort(
    (a, b) => {
      const priorityDiff =
        PRIORITY_RANK[a.priority] -
        PRIORITY_RANK[b.priority];

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      if (a.accuracy !== b.accuracy) {
        return (
          a.accuracy -
          b.accuracy
        );
      }

      const aTime =
        a.last_detected
          ? new Date(
              a.last_detected
            ).getTime()
          : 0;

      const bTime =
        b.last_detected
          ? new Date(
              b.last_detected
            ).getTime()
          : 0;

      return bTime - aTime;
    }
  )[0];

  return decisionForWeakness(
    chosen
  );
}

function determineMaintenanceAction(
  weaknesses: Weakness[],
  maintenanceReviews: MaintenanceReview[]
): AdaptiveDecision {
  const mastered =
    weaknesses.filter(
      (weakness) =>
        weakness.status ===
        'mastered'
    );

  if (mastered.length === 0) {
    return {
      action: 'all_mastered',
      category: null,
      difficulty: null,
      status: 'mastered',
      priority: 'low',
      reason:
        'No mastered category is currently available for maintenance review.',
    };
  }

  /*
   * If a category has produced one recent decline signal,
   * immediately review that same category again.
   *
   * This provides the second piece of evidence required
   * before reactivation.
   */
  const pendingConfirmation =
    mastered
      .map((weakness) => ({
        weakness,

        consecutiveDeclines:
          countConsecutiveDeclines(
            reviewsForCategory(
              maintenanceReviews,
              weakness.category
            )
          ),
      }))
      .filter(
        (item) =>
          item.consecutiveDeclines >
            0 &&
          item.consecutiveDeclines <
            ADAPTIVE_THRESHOLDS
              .MAINTENANCE_MIN_REVIEWS_FOR_REACTIVATION
      )
      .sort(
        (a, b) =>
          b.consecutiveDeclines -
          a.consecutiveDeclines
      )[0];

  if (pendingConfirmation) {
    return {
      action:
        'maintenance_review',

      category:
        pendingConfirmation
          .weakness.category,

      difficulty:
        'moderate',

      status:
        'mastered',

      priority:
        'low',

      reason:
        'A recent maintenance review showed possible decline. Running another review in the same category to confirm whether the weakness should be reactivated.',
    };
  }

  /*
   * A maintenance result between the reactivation threshold
   * and the pass threshold is neither a pass nor confirmed
   * decline.
   *
   * Example:
   *
   * 4/5 = 80%
   *
   * This is not strong enough to close the maintenance check,
   * but it is also not weak enough to count as decline.
   *
   * Therefore review the same category again.
   */
  const borderlineReview =
    mastered
      .map((weakness) => {
        const reviews =
          reviewsForCategory(
            maintenanceReviews,
            weakness.category
          );

        return {
          weakness,
          latestReview:
            reviews[0] ?? null,
        };
      })
      .filter(
        ({
          latestReview,
        }) => {
          if (!latestReview) {
            return false;
          }

          return (
            !latestReview
              .reactivation_signal &&
            latestReview.accuracy <
              ADAPTIVE_THRESHOLDS
                .MAINTENANCE_PASS_ACCURACY
          );
        }
      )
      .sort(
        (a, b) => {
          const aTime =
            a.latestReview
              ? new Date(
                  a.latestReview
                    .created_at
                ).getTime()
              : 0;

          const bTime =
            b.latestReview
              ? new Date(
                  b.latestReview
                    .created_at
                ).getTime()
              : 0;

          return bTime - aTime;
        }
      )[0];

  if (borderlineReview) {
    return {
      action:
        'maintenance_review',

      category:
        borderlineReview
          .weakness.category,

      difficulty:
        'moderate',

      status:
        'mastered',

      priority:
        'low',

      reason:
        `The latest maintenance result was ${Math.round(
          borderlineReview
            .latestReview!
            .accuracy * 100
        )}%. This is below the ${Math.round(
          ADAPTIVE_THRESHOLDS
            .MAINTENANCE_PASS_ACCURACY *
            100
        )}% maintenance target but not low enough to confirm decline. Reviewing the same category again.`,
    };
  }

  /*
   * Otherwise rotate maintenance fairly:
   *
   * 1. Category with the fewest previous reviews.
   * 2. If tied, category reviewed least recently.
   * 3. If still tied, use the fixed V1 category order.
   */
  const chosen =
    [...mastered].sort(
      (a, b) => {
        const aReviews =
          reviewsForCategory(
            maintenanceReviews,
            a.category
          );

        const bReviews =
          reviewsForCategory(
            maintenanceReviews,
            b.category
          );

        if (
          aReviews.length !==
          bReviews.length
        ) {
          return (
            aReviews.length -
            bReviews.length
          );
        }

        const aLatest =
          latestReviewTime(
            aReviews
          );

        const bLatest =
          latestReviewTime(
            bReviews
          );

        if (
          aLatest !== bLatest
        ) {
          return (
            aLatest -
            bLatest
          );
        }

        return (
          CATEGORY_RANK[
            a.category
          ] -
          CATEGORY_RANK[
            b.category
          ]
        );
      }
    )[0];

  const categoryReviews =
    reviewsForCategory(
      maintenanceReviews,
      chosen.category
    );

  return {
    action:
      'maintenance_review',

    category:
      chosen.category,

    difficulty:
      'moderate',

    status:
      'mastered',

    priority:
      'low',

    reason:
      categoryReviews.length ===
      0
        ? `The learner has mastered all tracked categories. Starting the first maintenance review for ${chosen.category}.`
        : `${chosen.category} is due for another maintenance review to make sure mastery is being retained.`,
  };
}

function reviewsForCategory(
  reviews: MaintenanceReview[],
  category: CoreCategory
): MaintenanceReview[] {
  return reviews
    .filter(
      (review) =>
        review.category ===
        category
    )
    .sort(
      (a, b) =>
        new Date(
          b.created_at
        ).getTime() -
        new Date(
          a.created_at
        ).getTime()
    );
}

function countConsecutiveDeclines(
  reviews: MaintenanceReview[]
): number {
  let count = 0;

  for (
    const review of reviews
  ) {
    if (
      !review.reactivation_signal
    ) {
      break;
    }

    count += 1;
  }

  return count;
}

function latestReviewTime(
  reviews: MaintenanceReview[]
): number {
  if (
    reviews.length === 0
  ) {
    return 0;
  }

  return Math.max(
    ...reviews.map(
      (review) =>
        new Date(
          review.created_at
        ).getTime()
    )
  );
}

function decisionForWeakness(
  weakness: Weakness
): AdaptiveDecision {
  const {
    LOW_PERFORMANCE_ACCURACY,
    NEEDS_PRACTICE_ACCURACY,
  } = ADAPTIVE_THRESHOLDS;

  if (
    weakness.status ===
    'potential'
  ) {
    return {
      action:
        'monitor',

      category:
        weakness.category,

      difficulty:
        'easy',

      status:
        weakness.status,

      priority:
        weakness.priority,

      reason:
        'A pattern is emerging in this category but there is not yet enough evidence (needs 3+ errors across 2+ attempts) to confirm a weakness. Generating easy practice to gather more evidence.',
    };
  }

  const hasExerciseEvidence =
    weakness
      .relevant_question_count >
    0;

  if (
    !hasExerciseEvidence ||
    weakness.accuracy <
      LOW_PERFORMANCE_ACCURACY
  ) {
    return {
      action:
        'explain_and_practice',

      category:
        weakness.category,

      difficulty:
        'easy',

      status:
        weakness.status,

      priority:
        weakness.priority,

      reason:
        hasExerciseEvidence
          ? `Accuracy (${Math.round(
              weakness.accuracy *
                100
            )}%) is below ${Math.round(
              LOW_PERFORMANCE_ACCURACY *
                100
            )}% — explaining the concept and starting at easy difficulty.`
          : 'Weakness confirmed from repeated writing errors; no exercise evidence yet — explaining the concept and starting at easy difficulty.',
    };
  }

  /*
   * Reactivated weakness protection.
   *
   * A category can be explicitly returned to needs_practice
   * after confirmed maintenance decline even when its historic
   * cumulative accuracy is still 70% or higher.
   *
   * In that case we must respect the recent decline signal
   * instead of immediately increasing difficulty.
   */
  if (
    weakness.status ===
      'needs_practice' &&
    weakness.accuracy >=
      NEEDS_PRACTICE_ACCURACY
  ) {
    return {
      action:
        'targeted_practice',

      category:
        weakness.category,

      difficulty:
        'moderate',

      status:
        weakness.status,

      priority:
        weakness.priority,

      reason:
        `Recent maintenance evidence confirmed decline in this category. Cumulative accuracy is ${Math.round(
          weakness.accuracy *
            100
        )}%, but the learner should return to targeted practice before difficulty is increased again.`,
    };
  }

  if (
    weakness.accuracy <
    NEEDS_PRACTICE_ACCURACY
  ) {
    return {
      action:
        'targeted_practice',

      category:
        weakness.category,

      difficulty:
        pickDifficulty(
          weakness,
          'easy'
        ),

      status:
        weakness.status,

      priority:
        weakness.priority,

      reason:
        `Accuracy (${Math.round(
          weakness.accuracy *
            100
        )}%) is low-to-medium — continuing targeted practice at easy/moderate difficulty.`,
    };
  }

  const accuracyPercent =
    Math.round(
      weakness.accuracy *
        100
    );

  const masteryQuestions =
    ADAPTIVE_THRESHOLDS
      .MASTERY_MIN_QUESTIONS;

  if (
    weakness.accuracy >=
      ADAPTIVE_THRESHOLDS
        .MASTERY_ACCURACY &&
    weakness
      .relevant_question_count <
      masteryQuestions
  ) {
    return {
      action:
        'targeted_practice_increase_difficulty',

      category:
        weakness.category,

      difficulty:
        pickDifficulty(
          weakness,
          'moderate'
        ),

      status:
        weakness.status,

      priority:
        weakness.priority,

      reason:
        `Accuracy is ${accuracyPercent}%. Performance is strong, but mastery requires at least ${masteryQuestions} relevant questions. Increasing difficulty to gather more evidence.`,
    };
  }

  return {
    action:
      'targeted_practice_increase_difficulty',

    category:
      weakness.category,

    difficulty:
      pickDifficulty(
        weakness,
        'moderate'
      ),

    status:
      weakness.status,

    priority:
      weakness.priority,

    reason:
      `Accuracy is ${accuracyPercent}%. Performance is strong but the category is not yet mastered. Increasing difficulty and reducing assistance.`,
  };
}

function pickDifficulty(
  weakness: Weakness,
  base: Difficulty
): Difficulty {
  const ladder: Difficulty[] =
    [
      'easy',
      'moderate',
      'hard',
      'transfer',
    ];

  const baseIndex =
    ladder.indexOf(base);

  const roundsAtThisAccuracyBand =
    Math.floor(
      weakness
        .relevant_question_count /
        ADAPTIVE_THRESHOLDS
          .EXERCISES_PER_SESSION
    );

  const bump =
    roundsAtThisAccuracyBand >=
    2
      ? 1
      : 0;

  const nextIndex =
    Math.min(
      baseIndex + bump,
      ladder.length - 1
    );

  return ladder[nextIndex];
}