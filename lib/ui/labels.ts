import type { AdaptiveAction, AdaptiveDecision, ArabicLevel, Difficulty, LearningGoal, WeaknessStatus } from '../types';

export const STATUS_LABEL: Record<WeaknessStatus, string> = {
  potential: 'قيد الملاحظة',
  needs_practice: 'يحتاج إلى تدريب',
  improving: 'يتحسّن',
  mastered: 'مُتقَن',
};

export const ACTION_LABEL: Record<AdaptiveAction, string> = {
  diagnostic_practice: 'تدريب تشخيصي',
  monitor: 'متابعة النمط',
  explain_and_practice: 'شرح وتدريب',
  targeted_practice: 'تدريب موجّه',
  targeted_practice_increase_difficulty: 'تدريب متقدّم',
  maintenance_review: 'مراجعة تثبيت',
  all_mastered: 'جميع المهارات متقنة',
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'سهل',
  moderate: 'متوسط',
  hard: 'متقدّم',
  transfer: 'تطبيقي',
};

export const LEVEL_LABEL: Record<ArabicLevel, string> = {
  Beginner: 'مبتدئ',
  Elementary: 'أساسي',
  Intermediate: 'متوسط',
  'Upper Intermediate': 'فوق المتوسط',
  Advanced: 'متقدّم',
};

export const GOAL_LABEL: Record<LearningGoal, string> = {
  Speaking: 'التحدّث',
  Writing: 'الكتابة',
  Reading: 'القراءة',
  'Understanding Arabic': 'فهم العربية',
  'General Arabic': 'العربية العامة',
};

export function actionLabel(action: AdaptiveAction): string {
  return ACTION_LABEL[action];
}

export function statusLabel(status: WeaknessStatus | null): string {
  return status ? STATUS_LABEL[status] : '—';
}

export function adaptiveReasonAr(decision: AdaptiveDecision): string {
  const percent = decision.reason.match(/(\d+)%/)?.[1];

  switch (decision.action) {
    case 'diagnostic_practice':
      return 'لا توجد أدلة كافية بعد. ابدأ التقييم التشخيصي حتى تبني رِحلة ملفك اللغوي.';
    case 'monitor':
      return 'ظهر نمط يستحق المتابعة، لكن رِحلة تحتاج إلى أدلة إضافية قبل اعتباره نقطة ضعف مؤكدة.';
    case 'explain_and_practice':
      return `تحتاج ${decision.category ?? 'هذه المهارة'} إلى شرح أوضح وتدريب أسهل قبل رفع مستوى الصعوبة.`;
    case 'targeted_practice':
      if (/maintenance|decline/i.test(decision.reason)) {
        return `أكدت مراجعات التثبيت وجود تراجع في ${decision.category ?? 'هذه المهارة'}؛ لذلك تعيد رِحلة التدريب الموجّه قبل زيادة الصعوبة.`;
      }
      return `تحتاج ${decision.category ?? 'هذه المهارة'} إلى مزيد من التدريب الموجّه${percent ? `؛ الدقة الحالية ${percent}%` : ''}.`;
    case 'targeted_practice_increase_difficulty':
      if (/mastery requires/i.test(decision.reason)) {
        return `الأداء قوي${percent ? ` بدقة ${percent}%` : ''}، لكن رِحلة تحتاج إلى مزيد من الأدلة قبل تثبيت الإتقان، لذلك سترفع الصعوبة تدريجيًا.`;
      }
      return `الأداء يتحسّن${percent ? ` بدقة ${percent}%` : ''}. سترفع رِحلة مستوى التحدّي تدريجيًا مع تقليل المساعدة.`;
    case 'maintenance_review':
      if (/possible decline/i.test(decision.reason)) {
        return 'أظهرت مراجعة حديثة انخفاضًا محتملاً في الأداء. ستراجع رِحلة المهارة مرة أخرى قبل إعادة تفعيل التدريب.';
      }
      if (/below the .*maintenance target/i.test(decision.reason)) {
        return `نتيجة المراجعة${percent ? ` ${percent}%` : ''} أقل من هدف التثبيت، لكنها لا تكفي لإثبات تراجع؛ لذلك ستُراجع المهارة مرة أخرى.`;
      }
      return `لقد أتقنت ${decision.category ?? 'هذه المهارة'} سابقًا. تتحقق رِحلة الآن من ثبات الإتقان مع مرور الوقت.`;
    case 'all_mastered':
      return 'جميع المهارات المتتبَّعة متقنة حاليًا. ستواصل رِحلة مراجعات التثبيت للمحافظة على هذا المستوى.';
  }
}
