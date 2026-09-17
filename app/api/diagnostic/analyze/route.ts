import { NextRequest, NextResponse } from 'next/server';
import { analyzeArabic } from '../../../../lib/ai/analyzeArabic';
import { createAttempt } from '../../../../lib/db/attempts';
import { saveErrors } from '../../../../lib/db/errors';
import { getWeaknessesForLearner, recordDiagnosticEvidence } from '../../../../lib/db/weaknesses';
import { getLearner } from '../../../../lib/db/learners';
import { determineNextAction } from '../../../../lib/adaptive/engine';
import { CORE_CATEGORIES, type CoreCategory } from '../../../../lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { learnerId, text } = body ?? {};

    if (typeof learnerId !== 'string' || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'learnerId and text are required' }, { status: 400 });
    }

    // Confirm learner exists before spending an AI call.
    await getLearner(learnerId);

    // 1. AI analysis (validated with Zod inside analyzeArabic).
    const analysis = await analyzeArabic(text);

    // 2. Store the diagnostic attempt and its detected errors.
    const attempt = await createAttempt(learnerId, text);
    const coreErrors = analysis.errors.filter((e) =>
      (CORE_CATEGORIES as readonly string[]).includes(e.category)
    );
    const savedErrors = await saveErrors(learnerId, attempt.id, analysis.errors);

    // 3. Update weakness evidence per category (application logic only —
    //    the AI never decides what counts as a confirmed weakness).
    const errorCountsByCategory = new Map<CoreCategory, number>();
    for (const e of coreErrors) {
      const cat = e.category as CoreCategory;
      errorCountsByCategory.set(cat, (errorCountsByCategory.get(cat) ?? 0) + 1);
    }
    for (const category of CORE_CATEGORIES) {
      const count = errorCountsByCategory.get(category) ?? 0;
      if (count > 0) {
        await recordDiagnosticEvidence(learnerId, category, count);
      }
    }

    // 4. Re-run the adaptive engine with fresh state.
    const learner = await getLearner(learnerId);
    const weaknesses = await getWeaknessesForLearner(learnerId);
    const decision = determineNextAction({ learner, weaknesses });

    return NextResponse.json({
      attempt,
      analysis: {
        overall_feedback_ar: analysis.overall_feedback_ar,
        strengths: analysis.strengths,
      },
      errors: savedErrors,
      weaknesses,
      decision,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
