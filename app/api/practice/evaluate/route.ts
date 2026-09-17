import { NextRequest, NextResponse } from 'next/server';

import {
  getLearner,
} from '../../../../lib/db/learners';

import {
  getWeaknessesForLearner,
  recordPracticeEvidence,
  reactivateWeaknessFromMaintenance,
} from '../../../../lib/db/weaknesses';

import {
  getExercisesForSession,
  getPracticeSession,
  completePracticeSession,
} from '../../../../lib/db/exercises';

import {
  submitAnswers,
  type AnswerSubmission,
} from '../../../../lib/db/exerciseAttempts';

import {
  recordMaintenanceReview,
  getMaintenanceReviewsForLearner,
  getMaintenanceReviewsForCategory,
  countConsecutiveDeclineSignals,
} from '../../../../lib/db/maintenanceReviews';

import {
  determineNextAction,
} from '../../../../lib/adaptive/engine';

import {
  ADAPTIVE_THRESHOLDS,
} from '../../../../lib/adaptive/thresholds';

import type {
  CoreCategory,
  MaintenanceReview,
  Weakness,
} from '../../../../lib/types';

export async function POST(
  req: NextRequest
) {
  try {
    const body = await req.json();

    const {
      learnerId,
      practiceSessionId,
      submissions,
    } = body ?? {};

    if (
      typeof learnerId !==
        'string' ||
      typeof practiceSessionId !==
        'string' ||
      !Array.isArray(submissions)
    ) {
      return NextResponse.json(
        {
          error:
            'learnerId, practiceSessionId, and submissions[] are required',
        },
        {
          status: 400,
        }
      );
    }

    const practiceSession =
      await getPracticeSession(
        practiceSessionId
      );

    if (
      practiceSession.learner_id !==
      learnerId
    ) {
      return NextResponse.json(
        {
          error:
            'Practice session does not belong to this learner',
        },
        {
          status: 403,
        }
      );
    }

    const exercises =
      await getExercisesForSession(
        practiceSessionId
      );

    if (
      exercises.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            'practice session has no exercises',
        },
        {
          status: 404,
        }
      );
    }

    const category =
      exercises[0]
        .weakness_category as CoreCategory;

    const {
      attempts,
      correctCount,
      total,
    } = await submitAnswers(
      learnerId,
      exercises,
      submissions as AnswerSubmission[]
    );

    const score =
      total > 0
        ? correctCount / total
        : 0;

    /*
     * ---------------------------------------------------------
     * NORMAL ADAPTIVE PRACTICE
     * ---------------------------------------------------------
     */
    if (
      practiceSession.session_type ===
      'adaptive_practice'
    ) {
      const weaknessesBefore =
        await getWeaknessesForLearner(
          learnerId
        );

      const before =
        weaknessesBefore.find(
          (weakness) =>
            weakness.category ===
            category
        );

      const updatedWeakness =
        await recordPracticeEvidence(
          learnerId,
          category,
          {
            totalQuestions: total,
            correctCount,
          }
        );

      await completePracticeSession(
        practiceSessionId,
        {
          score,
          accuracyAfter:
            updatedWeakness.accuracy,
        }
      );

      const learner =
        await getLearner(
          learnerId
        );

      const weaknessesAfter =
        await getWeaknessesForLearner(
          learnerId
        );

      const maintenanceReviews =
        await getMaintenanceReviewsForLearner(
          learnerId
        );

      const nextDecision =
        determineNextAction({
          learner,
          weaknesses:
            weaknessesAfter,
          maintenanceReviews,
        });

      return NextResponse.json({
        mode:
          'adaptive_practice',

        result: {
          correctCount,
          total,
          score,
        },

        attempts,

        weakness: {
          before:
            before ?? null,

          after:
            updatedWeakness,
        },

        maintenanceReview:
          null,

        reactivated:
          false,

        nextDecision,
      });
    }

    /*
     * ---------------------------------------------------------
     * MAINTENANCE REVIEW
     * ---------------------------------------------------------
     */
    if (
      practiceSession.session_type ===
      'maintenance_review'
    ) {
      const weaknessesBefore =
        await getWeaknessesForLearner(
          learnerId
        );

      const before =
        weaknessesBefore.find(
          (weakness) =>
            weakness.category ===
            category
        );

      if (!before) {
        return NextResponse.json(
          {
            error:
              `No weakness record found for category: ${category}`,
          },
          {
            status: 404,
          }
        );
      }

      const maintenanceReview =
        await recordMaintenanceReview(
          learnerId,
          category,
          {
            totalQuestions: total,
            correctCount,
          }
        );

      let updatedWeakness:
        Weakness = before;

      let reactivated = false;

      const declineSignals =
        await countConsecutiveDeclineSignals(
          learnerId,
          category
        );

      /*
       * Reactivation occurs only after the required number
       * of consecutive weak maintenance reviews.
       */
      if (
        declineSignals >=
        ADAPTIVE_THRESHOLDS
          .MAINTENANCE_MIN_REVIEWS_FOR_REACTIVATION
      ) {
        const reviews =
          await getMaintenanceReviewsForCategory(
            learnerId,
            category
          );

        const declineEvidence =
          getLatestConsecutiveDeclineEvidence(
            reviews
          );

        updatedWeakness =
          await reactivateWeaknessFromMaintenance(
            learnerId,
            category,
            {
              totalQuestions:
                declineEvidence.totalQuestions,

              correctCount:
                declineEvidence.correctCount,

              reviewCount:
                declineEvidence.reviewCount,
            }
          );

        reactivated = true;
      }

      await completePracticeSession(
        practiceSessionId,
        {
          score,

          /*
           * Maintenance does not normally change cumulative
           * weakness accuracy.
           *
           * If confirmed decline caused reactivation,
           * updatedWeakness contains the new adaptive state.
           */
          accuracyAfter:
            updatedWeakness.accuracy,
        }
      );

      const learner =
        await getLearner(
          learnerId
        );

      const weaknessesAfter =
        await getWeaknessesForLearner(
          learnerId
        );

      const maintenanceReviews =
        await getMaintenanceReviewsForLearner(
          learnerId
        );

      const nextDecision =
        determineNextAction({
          learner,
          weaknesses:
            weaknessesAfter,
          maintenanceReviews,
        });

      return NextResponse.json({
        mode:
          'maintenance_review',

        result: {
          correctCount,
          total,
          score,
        },

        attempts,

        weakness: {
          before,

          after:
            updatedWeakness,
        },

        maintenanceReview,

        reactivated,

        nextDecision,
      });
    }

    return NextResponse.json(
      {
        error:
          `Unsupported practice session type: ${practiceSession.session_type}`,
      },
      {
        status: 400,
      }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          (err as Error).message,
      },
      {
        status: 500,
      }
    );
  }
}

function getLatestConsecutiveDeclineEvidence(
  reviews: MaintenanceReview[]
): {
  totalQuestions: number;
  correctCount: number;
  reviewCount: number;
} {
  let totalQuestions = 0;
  let correctCount = 0;
  let reviewCount = 0;

  for (const review of reviews) {
    if (
      !review.reactivation_signal
    ) {
      break;
    }

    totalQuestions +=
      review.total_questions;

    correctCount +=
      review.correct_count;

    reviewCount += 1;
  }

  return {
    totalQuestions,
    correctCount,
    reviewCount,
  };
}