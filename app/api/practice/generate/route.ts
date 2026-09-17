import { NextRequest, NextResponse } from 'next/server';

import { getLearner } from '../../../../lib/db/learners';

import {
  getWeaknessesForLearner,
} from '../../../../lib/db/weaknesses';

import {
  getRecentErrorTexts,
} from '../../../../lib/db/errors';

import {
  createPracticeSession,
  saveExercises,
} from '../../../../lib/db/exercises';

import {
  getMaintenanceReviewsForLearner,
} from '../../../../lib/db/maintenanceReviews';

import {
  determineNextAction,
} from '../../../../lib/adaptive/engine';

import {
  generateExercises,
} from '../../../../lib/ai/generateExercises';

export async function POST(
  req: NextRequest
) {
  try {
    const body = await req.json();

    const { learnerId } = body ?? {};

    if (typeof learnerId !== 'string') {
      return NextResponse.json(
        {
          error:
            'learnerId is required',
        },
        {
          status: 400,
        }
      );
    }

    const learner =
      await getLearner(learnerId);

    const weaknesses =
      await getWeaknessesForLearner(
        learnerId
      );

    /*
     * Maintenance history is always loaded.
     *
     * This allows the adaptive engine to:
     *
     * - enter maintenance after mastery,
     * - rotate mastered categories,
     * - detect pending decline confirmation.
     */
    const maintenanceReviews =
      await getMaintenanceReviewsForLearner(
        learnerId
      );

    const decision =
      determineNextAction({
        learner,
        weaknesses,
        maintenanceReviews,
      });

    /*
     * Some decisions do not require an exercise batch.
     */
    if (
      !decision.category ||
      !decision.difficulty
    ) {
      return NextResponse.json({
        decision,
        practiceSession: null,
        exercises: [],
      });
    }

    const weakness =
      weaknesses.find(
        (item) =>
          item.category ===
          decision.category
      );

    if (!weakness) {
      return NextResponse.json(
        {
          error:
            `No weakness record found for category: ${decision.category}`,
        },
        {
          status: 404,
        }
      );
    }

    const previousErrors =
      await getRecentErrorTexts(
        learnerId,
        decision.category
      );

    const batch =
      await generateExercises({
        learnerLevel:
          learner.observed_level,

        weakness:
          decision.category,

        accuracy:
          weakness.accuracy,

        status:
          decision.status ??
          weakness.status,

        difficulty:
          decision.difficulty,

        previousErrors,

        learningGoal:
          learner.learning_goal,
      });

    const isMaintenance =
      decision.action ===
      'maintenance_review';

    const practiceSession =
      await createPracticeSession({
        learnerId,

        category:
          decision.category,

        difficulty:
          decision.difficulty,

        accuracyBefore:
          weakness.accuracy,

        sessionType:
          isMaintenance
            ? 'maintenance_review'
            : 'adaptive_practice',
      });

    const savedExercises =
      await saveExercises(
        learnerId,
        practiceSession.id,
        batch.exercises
      );

    /*
     * Never expose correct answers to the browser before
     * evaluation.
     */
const exercisesForClient =
  savedExercises.map(
    (exercise) => {
      const {
        correct_answer,
        ...rest
      } = exercise;

      void correct_answer;

      return rest;
    }
  );

    return NextResponse.json({
      decision,
      practiceSession,
      exercises:
        exercisesForClient,
    });
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