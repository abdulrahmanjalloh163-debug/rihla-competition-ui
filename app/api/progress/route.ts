import { NextRequest, NextResponse } from 'next/server';
import { getLearner } from '../../../lib/db/learners';
import { getWeaknessesForLearner } from '../../../lib/db/weaknesses';
import { getMaintenanceReviewsForLearner } from '../../../lib/db/maintenanceReviews';
import { determineNextAction } from '../../../lib/adaptive/engine';

export async function GET(req: NextRequest) {
  try {
    const learnerId = req.nextUrl.searchParams.get('learnerId');
    if (!learnerId) return NextResponse.json({ error: 'learnerId is required' }, { status: 400 });
    const [learner, weaknesses, maintenanceReviews] = await Promise.all([
      getLearner(learnerId),
      getWeaknessesForLearner(learnerId),
      getMaintenanceReviewsForLearner(learnerId),
    ]);
    const decision = determineNextAction({ learner, weaknesses, maintenanceReviews });
    return NextResponse.json({ learner, weaknesses, maintenanceReviews, decision });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
