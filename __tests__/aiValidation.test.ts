import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock the provider layer so we can inject both valid and invalid
// "Claude" responses deterministically, without needing a live
// ANTHROPIC_API_KEY. This directly tests the Zod validation gate
// described in analyzeArabic.ts / generateExercises.ts: "nothing
// from the model reaches the adaptive engine or the database
// without passing this."
vi.mock('../lib/ai/index', () => ({
  llmProvider: { callStructured: vi.fn() },
}));

import { llmProvider } from '../lib/ai/index';
import { analyzeArabic } from '../lib/ai/analyzeArabic';
import { generateExercises } from '../lib/ai/generateExercises';

const mockCallStructured = llmProvider.callStructured as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockCallStructured.mockReset();
});

describe('Zod validation gate — analyzeArabic', () => {
  it('accepts a well-formed analysis response', async () => {
    mockCallStructured.mockResolvedValue({
      overall_feedback_ar: 'أداء جيد بشكل عام.',
      errors: [
        {
          category: 'حروف الجر',
          original_text: 'ذهبتُ في المدرسة.',
          correction: 'ذهبتُ إلى المدرسة.',
          explanation_ar: 'نستخدم «إلى» للدلالة على الاتجاه إلى مكان.',
          explanation_en: 'Use «إلى» to indicate movement toward a place.',
          confidence: 0.95,
        },
      ],
      strengths: ['قواعد الجملة الأساسية سليمة.'],
    });

    const result = await analyzeArabic('ذهبتُ في المدرسة.');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].category).toBe('حروف الجر');
  });

  it('rejects a response with an out-of-range confidence score', async () => {
    mockCallStructured.mockResolvedValue({
      overall_feedback_ar: 'test',
      errors: [
        {
          category: 'حروف الجر',
          original_text: 'x',
          correction: 'y',
          explanation_ar: 'z',
          explanation_en: 'z',
          confidence: 1.5, // invalid: > 1
        },
      ],
      strengths: [],
    });

    await expect(analyzeArabic('test text')).rejects.toThrow(/schema validation/);
  });

  it('rejects a response with an invalid category outside the locked taxonomy', async () => {
    mockCallStructured.mockResolvedValue({
      overall_feedback_ar: 'test',
      errors: [
        {
          category: 'تصريف الفعل', // not one of the 3 core categories or "Other"
          original_text: 'x',
          correction: 'y',
          explanation_ar: 'z',
          explanation_en: 'z',
          confidence: 0.8,
        },
      ],
      strengths: [],
    });

    await expect(analyzeArabic('test text')).rejects.toThrow(/schema validation/);
  });

  it('rejects a response missing required fields entirely', async () => {
    mockCallStructured.mockResolvedValue({ errors: [] }); // missing overall_feedback_ar, strengths

    await expect(analyzeArabic('test text')).rejects.toThrow(/schema validation/);
  });

  it('rejects malformed shapes (string instead of object)', async () => {
    mockCallStructured.mockResolvedValue('not an object at all');

    await expect(analyzeArabic('test text')).rejects.toThrow(/schema validation/);
  });
});

describe('Zod validation gate — generateExercises', () => {
  const validInput = {
    learnerLevel: 'Intermediate' as const,
    weakness: 'حروف الجر' as const,
    accuracy: 0.5,
    status: 'needs_practice',
    difficulty: 'easy' as const,
    previousErrors: ['ذهبتُ في المدرسة.'],
    learningGoal: 'Writing' as const,
  };

  function validExercise(overrides: Record<string, unknown> = {}) {
    return {
      target_category: 'حروف الجر',
      difficulty: 'easy',
      exercise_type: 'multiple_choice',
      instruction_ar: 'اختر حرف الجر المناسب.',
      question: 'ذهبتُ ___ المسجدِ.',
      options: ['في', 'إلى', 'مع'],
      correct_answer: 'إلى',
      explanation_ar: 'نستخدم «إلى» للدلالة على الاتجاه إلى مكان.',
      ...overrides,
    };
  }

  it('accepts exactly 5 well-formed exercises', async () => {
    mockCallStructured.mockResolvedValue({
      exercises: Array.from({ length: 5 }, () => validExercise()),
    });

    const result = await generateExercises(validInput);
    expect(result.exercises).toHaveLength(5);
  });

  it('rejects a batch with fewer than 5 exercises (spec §17: exactly 5)', async () => {
    mockCallStructured.mockResolvedValue({
      exercises: Array.from({ length: 3 }, () => validExercise()),
    });

    await expect(generateExercises(validInput)).rejects.toThrow(/schema validation/);
  });

  it('rejects a batch with more than 5 exercises', async () => {
    mockCallStructured.mockResolvedValue({
      exercises: Array.from({ length: 7 }, () => validExercise()),
    });

    await expect(generateExercises(validInput)).rejects.toThrow(/schema validation/);
  });

  it('rejects a multiple_choice exercise with fewer than 2 options', async () => {
    mockCallStructured.mockResolvedValue({
      exercises: [
        validExercise({ options: ['في'] }),
        validExercise(),
        validExercise(),
        validExercise(),
        validExercise(),
      ],
    });

    await expect(generateExercises(validInput)).rejects.toThrow(/schema validation/);
  });

  it('rejects an exercise targeting a category outside the locked taxonomy', async () => {
    mockCallStructured.mockResolvedValue({
      exercises: [
        validExercise({ target_category: 'الإعراب' }),
        validExercise(),
        validExercise(),
        validExercise(),
        validExercise(),
      ],
    });

    await expect(generateExercises(validInput)).rejects.toThrow(/schema validation/);
  });
});
