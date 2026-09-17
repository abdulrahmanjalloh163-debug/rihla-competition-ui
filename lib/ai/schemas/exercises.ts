import { z } from 'zod';
import { CORE_CATEGORIES } from '../../types';

export const exerciseTypeSchema = z.enum([
  'multiple_choice',
  'correction',
  'fill_in_blank',
  'free_production',
]);

export const difficultySchema = z.enum(['easy', 'moderate', 'hard', 'transfer']);

export const generatedExerciseSchema = z
  .object({
    target_category: z.enum(CORE_CATEGORIES),
    difficulty: difficultySchema,
    exercise_type: exerciseTypeSchema,
    instruction_ar: z.string().min(1),
    question: z.string().min(1),
    options: z.array(z.string()).nullable().optional(),
    correct_answer: z.string().min(1),
    explanation_ar: z.string().min(1),
  })
  .refine(
    (ex) => ex.exercise_type !== 'multiple_choice' || (ex.options && ex.options.length >= 2),
    { message: 'multiple_choice exercises must include at least 2 options' }
  );

// Exactly 5 exercises per adaptive intervention (spec §17).
export const exerciseBatchSchema = z.object({
  exercises: z.array(generatedExerciseSchema).length(5),
});

export type GeneratedExercise = z.infer<typeof generatedExerciseSchema>;
export type ExerciseBatch = z.infer<typeof exerciseBatchSchema>;

export const exerciseBatchToolSchema = {
  name: 'submit_exercise_batch',
  description: 'Submit exactly 5 generated Arabic learning exercises.',
  input_schema: {
    type: 'object' as const,
    properties: {
      exercises: {
        type: 'array' as const,
        minItems: 5,
        maxItems: 5,
        items: {
          type: 'object' as const,
          properties: {
            target_category: { type: 'string' as const, enum: [...CORE_CATEGORIES] },
            difficulty: {
              type: 'string' as const,
              enum: ['easy', 'moderate', 'hard', 'transfer'],
            },
            exercise_type: {
              type: 'string' as const,
              enum: ['multiple_choice', 'correction', 'fill_in_blank', 'free_production'],
            },
            instruction_ar: { type: 'string' as const },
            question: { type: 'string' as const },
            options: {
              type: 'array' as const,
              items: { type: 'string' as const },
            },
            correct_answer: { type: 'string' as const },
            explanation_ar: { type: 'string' as const },
          },
          required: [
            'target_category',
            'difficulty',
            'exercise_type',
            'instruction_ar',
            'question',
            'correct_answer',
            'explanation_ar',
          ],
        },
      },
    },
    required: ['exercises'],
  },
};
