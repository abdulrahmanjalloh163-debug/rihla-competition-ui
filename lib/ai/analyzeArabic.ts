import { llmProvider } from './index';
import { analysisResponseSchema, analysisToolSchema, type AnalysisResponse } from './schemas/analysis';

const SYSTEM_PROMPT = `You are the Arabic language analysis engine for رِحلة.

Analyze the learner's Arabic response.

Your primary purpose is to identify evidence related to these three categories only:

1. حروف الجر
2. التذكير والتأنيث
3. المفرد والجمع

For every detected relevant error:
- quote the learner's original phrase
- provide a corrected version
- explain the correction
- assign a confidence score from 0 to 1
- identify the category

Do not invent errors.

Do not mark stylistic preferences as grammatical errors.

Do not classify an error as a core weakness.

You are detecting individual errors only.

The application will determine whether repeated errors constitute a weakness.

If you notice an error outside the three categories above, you may include it with category "Other" — never use it to imply a core weakness.

Call the submit_arabic_analysis tool with your findings.`;

/**
 * Analyzes one diagnostic (or future free-text) submission.
 *
 * IMPORTANT: this function only detects and explains individual
 * errors. It never decides whether something is a "weakness" — that
 * determination is entirely application logic (lib/adaptive), per
 * the mandatory AI/application separation in spec §29.
 */
export async function analyzeArabic(learnerText: string): Promise<AnalysisResponse> {
  const userPrompt = `Learner's Arabic writing submission:\n\n${learnerText}`;

  const raw = await llmProvider.callStructured({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    tool: analysisToolSchema,
  });

  // Zod validation gate — nothing from the model reaches the
  // adaptive engine or the database without passing this.
  const parsed = analysisResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Claude's analysis response failed schema validation: ${parsed.error.message}`
    );
  }

  return parsed.data;
}
