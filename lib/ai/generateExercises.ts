import { llmProvider } from './index';
import { exerciseBatchSchema, exerciseBatchToolSchema, type ExerciseBatch } from './schemas/exercises';
import type { CoreCategory, Difficulty, LearningGoal, ArabicLevel } from '../types';

const SYSTEM_PROMPT = `You are the exercise-generation engine for رِحلة.

Generate exactly 5 Arabic learning exercises.

The adaptive engine has already determined:
- learner level
- target weakness
- difficulty
- exercise type requirements

Your job is to create exercises targeting the specified weakness.

Do not introduce unnecessary unrelated grammar difficulty.

Use natural Modern Standard Arabic.

The exercises must test the target weakness rather than obscure it.

Call the submit_exercise_batch tool with your 5 exercises.

Every exercise must include:
- target_category
- difficulty
- exercise_type
- instruction_ar
- question
- options when applicable
- correct_answer
- explanation_ar`;

export interface GenerateExercisesInput {
  learnerLevel: ArabicLevel;
  weakness: CoreCategory;
  accuracy: number;
  status: string;
  difficulty: Difficulty;
  previousErrors: string[];
  learningGoal: LearningGoal;
}

/**
 * Generates a batch of 5 exercises for the category/difficulty the
 * adaptive engine already chose. This function — and the LLM behind
 * it — has no say in WHICH category to target; that decision comes
 * in as a parameter, decided entirely by lib/adaptive/engine.ts
 * (spec §14: "The generator must NOT decide the learner's weakness").
 */
export async function generateExercises(input: GenerateExercisesInput): Promise<ExerciseBatch> {
  const userPrompt = JSON.stringify(
    {
      learner_level: input.learnerLevel,
      weakness: input.weakness,
      accuracy: input.accuracy,
      status: input.status,
      difficulty: input.difficulty,
      previous_errors: input.previousErrors,
      learning_goal: input.learningGoal,
    },
    null,
    2
  );

  const raw = await llmProvider.callStructured({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    tool: exerciseBatchToolSchema,
  });

  const parsed = exerciseBatchSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Claude's exercise batch failed schema validation: ${parsed.error.message}`
    );
  }

  return parsed.data;
}
