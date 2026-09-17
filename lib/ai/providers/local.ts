import type { LLMProvider, StructuredCallInput } from '../provider';

const ANALYSIS_TOOL = 'submit_arabic_analysis';
const EXERCISE_TOOL = 'submit_exercise_batch';

/**
 * Free local V1 fallback.
 *
 * Used when Anthropic is unavailable. It supports the two structured
 * operations currently needed by the prototype:
 *
 * 1. Arabic diagnostic analysis
 * 2. Adaptive exercise generation
 *
 * This is deterministic prototype logic, not a replacement for a
 * production Arabic AI model.
 */
export const localProvider: LLMProvider = {
  async callStructured({
    userPrompt,
    tool,
  }: StructuredCallInput): Promise<unknown> {
    if (tool.name === ANALYSIS_TOOL) {
      return analyzeLocally(userPrompt);
    }

    if (tool.name === EXERCISE_TOOL) {
      return generateExercisesLocally(userPrompt);
    }

    throw new Error(`Local provider does not support tool "${tool.name}".`);
  },
};

function analyzeLocally(userPrompt: string) {
  const originalText = extractLearnerText(userPrompt);
  const text = normalizeArabicForMatching(originalText);

  const errors = [];

  // حروف الجر
  if (/ذهبت\s+في\s+المسجد/.test(text)) {
    errors.push({
      category: 'حروف الجر',
      original_text: 'ذهبت في المسجد',
      correction: 'ذهبت إلى المسجد',
      explanation_ar: 'نستخدم «إلى» للدلالة على الاتجاه إلى مكان.',
      explanation_en: 'Use «إلى» to indicate movement toward a place.',
      confidence: 0.99,
    });
  }

  if (/ذهبت\s+في\s+المطعم/.test(text)) {
    errors.push({
      category: 'حروف الجر',
      original_text: 'ذهبت في المطعم',
      correction: 'ذهبت إلى المطعم',
      explanation_ar: 'نستخدم «إلى» للدلالة على الاتجاه إلى مكان.',
      explanation_en: 'Use «إلى» to indicate movement toward a place.',
      confidence: 0.99,
    });
  }

  // التذكير والتأنيث
  if (/كتابا?\s+جديدة/.test(text)) {
    errors.push({
      category: 'التذكير والتأنيث',
      original_text: 'كتابًا جديدة',
      correction: 'كتابًا جديدًا',
      explanation_ar:
        'كلمة «كتاب» مذكر، لذلك يجب أن تكون الصفة «جديدًا».',
      explanation_en:
        'The noun «كتاب» is masculine, so the adjective should be «جديدًا».',
      confidence: 0.99,
    });
  }

  if (/هذه\s+كتاب(?:\s+جديد)?/.test(text)) {
    errors.push({
      category: 'التذكير والتأنيث',
      original_text: 'هذه كتاب',
      correction: 'هذا كتاب',
      explanation_ar:
        'كلمة «كتاب» مذكر، لذلك نستخدم اسم الإشارة «هذا» لا «هذه».',
      explanation_en:
        'The noun «كتاب» is masculine, so use «هذا» rather than «هذه».',
      confidence: 0.99,
    });
  }

  // المفرد والجمع
  if (/ثلاثة\s+كتاب/.test(text)) {
    errors.push({
      category: 'المفرد والجمع',
      original_text: 'ثلاثة كتاب',
      correction: 'ثلاثة كتب',
      explanation_ar:
        'بعد العدد «ثلاثة» نستخدم جمع التكسير المناسب، وهنا «كتب».',
      explanation_en:
        'After the number «ثلاثة», the appropriate plural form is «كتب».',
      confidence: 0.99,
    });
  }

  return {
    overall_feedback_ar:
      errors.length > 0
        ? 'كتابتك مفهومة، وقد رصدنا بعض الأخطاء التي تحتاج إلى مزيد من التدريب.'
        : 'كتابتك جيدة ولم نرصد أخطاء ضمن الفئات الأساسية في هذا الاختبار.',
    errors,
    strengths: [
      'استخدام جمل قصيرة وواضحة.',
      'التعبير عن أحداث يومية بطريقة مفهومة.',
    ],
  };
}

function generateExercisesLocally(userPrompt: string) {
  const input = JSON.parse(userPrompt) as {
    learner_level: string;
    weakness: string;
    accuracy: number;
    status: string;
    difficulty: string;
    previous_errors: string[];
    learning_goal: string;
  };

  const difficulty = input.difficulty;
  const weakness = input.weakness;

  if (weakness === 'المفرد والجمع') {
    return {
      exercises: [
        {
          target_category: 'المفرد والجمع',
          difficulty,
          exercise_type: 'multiple_choice',
          instruction_ar: 'اختر الكلمة الصحيحة.',
          question: 'قرأتُ ثلاثة ___ في المكتبة.',
          options: ['كتاب', 'كتب', 'كاتبة'],
          correct_answer: 'كتب',
          explanation_ar: 'بعد «ثلاثة» نستخدم جمع «كتاب»، وهو «كتب».',
        },
        {
          target_category: 'المفرد والجمع',
          difficulty,
          exercise_type: 'multiple_choice',
          instruction_ar: 'اختر الجمع الصحيح.',
          question: 'جمع كلمة «طالب» هو:',
          options: ['طلاب', 'طالبة', 'طالبان'],
          correct_answer: 'طلاب',
          explanation_ar: 'جمع كلمة «طالب» هو «طلاب».',
        },
        {
          target_category: 'المفرد والجمع',
          difficulty,
          exercise_type: 'fill_in_blank',
          instruction_ar: 'أكمل الجملة بالكلمة المناسبة.',
          question: 'رأيتُ خمسة ___.',
          options: null,
          correct_answer: 'طلاب',
          explanation_ar: 'بعد العدد «خمسة» نستخدم جمع «طالب»، وهو «طلاب».',
        },
        {
          target_category: 'المفرد والجمع',
          difficulty,
          exercise_type: 'correction',
          instruction_ar: 'صحح الجملة.',
          question: 'اشتريتُ ثلاثة كتاب.',
          options: null,
          correct_answer: 'اشتريتُ ثلاثة كتب.',
          explanation_ar: 'الصحيح «كتب» لأنها جمع كلمة «كتاب».',
        },
        {
          target_category: 'المفرد والجمع',
          difficulty,
          exercise_type: 'multiple_choice',
          instruction_ar: 'اختر الجملة الصحيحة.',
          question: 'أي جملة صحيحة؟',
          options: [
            'هذه كتبٌ جديدةٌ.',
            'هذه كتابٌ جديدةٌ.',
            'هذا كتبٌ جديدٌ.',
          ],
          correct_answer: 'هذه كتبٌ جديدةٌ.',
          explanation_ar: '«كتب» جمع، والصفة «جديدة» مناسبة للجمع غير العاقل.',
        },
      ],
    };
  }

  if (weakness === 'حروف الجر') {
    return {
      exercises: [
        {
          target_category: 'حروف الجر',
          difficulty,
          exercise_type: 'multiple_choice',
          instruction_ar: 'اختر حرف الجر المناسب.',
          question: 'ذهبتُ ___ المسجدِ لصلاة الفجر.',
          options: ['في', 'إلى', 'مع'],
          correct_answer: 'إلى',
          explanation_ar: 'نستخدم «إلى» للدلالة على الاتجاه إلى مكان.',
        },
        {
          target_category: 'حروف الجر',
          difficulty,
          exercise_type: 'multiple_choice',
          instruction_ar: 'اختر حرف الجر المناسب.',
          question: 'جلستُ ___ الغرفةِ.',
          options: ['في', 'إلى', 'من'],
          correct_answer: 'في',
          explanation_ar: 'نستخدم «في» للدلالة على وجود الشيء داخل مكان.',
        },
        {
          target_category: 'حروف الجر',
          difficulty,
          exercise_type: 'fill_in_blank',
          instruction_ar: 'أكمل بحرف الجر المناسب.',
          question: 'ذهبتُ ___ المدرسةِ.',
          options: null,
          correct_answer: 'إلى',
          explanation_ar: 'نستخدم «إلى» مع فعل الذهاب للدلالة على الاتجاه.',
        },
        {
          target_category: 'حروف الجر',
          difficulty,
          exercise_type: 'correction',
          instruction_ar: 'صحح الجملة.',
          question: 'ذهبتُ في المسجدِ.',
          options: null,
          correct_answer: 'ذهبتُ إلى المسجدِ.',
          explanation_ar:
            'الصحيح «إلى المسجد» لأن الجملة تدل على الحركة نحو المسجد.',
        },
        {
          target_category: 'حروف الجر',
          difficulty,
          exercise_type: 'multiple_choice',
          instruction_ar: 'اختر الجملة الصحيحة.',
          question: 'أي جملة صحيحة؟',
          options: [
            'ذهبتُ إلى المدرسةِ.',
            'ذهبتُ في المدرسةِ.',
            'ذهبتُ من المدرسةِ.',
          ],
          correct_answer: 'ذهبتُ إلى المدرسةِ.',
          explanation_ar: 'نستخدم «إلى» للدلالة على الاتجاه إلى المدرسة.',
        },
      ],
    };
  }

  return {
    exercises: [
      {
        target_category: 'التذكير والتأنيث',
        difficulty,
        exercise_type: 'multiple_choice',
        instruction_ar: 'اختر الصفة الصحيحة.',
        question: 'هذا كتابٌ ___.',
        options: ['جديد', 'جديدة', 'جديدًا'],
        correct_answer: 'جديد',
        explanation_ar: 'كلمة «كتاب» مذكر، لذلك نقول «كتابٌ جديد».',
      },
      {
        target_category: 'التذكير والتأنيث',
        difficulty,
        exercise_type: 'multiple_choice',
        instruction_ar: 'اختر الصفة الصحيحة.',
        question: 'هذه سيارةٌ ___.',
        options: ['جديد', 'جديدة', 'جديدان'],
        correct_answer: 'جديدة',
        explanation_ar: 'كلمة «سيارة» مؤنث، لذلك نقول «سيارةٌ جديدة».',
      },
      {
        target_category: 'التذكير والتأنيث',
        difficulty,
        exercise_type: 'fill_in_blank',
        instruction_ar: 'أكمل بالصفة المناسبة.',
        question: 'المدرسةُ ___.',
        options: null,
        correct_answer: 'كبيرة',
        explanation_ar: 'كلمة «المدرسة» مؤنث، لذلك نستخدم «كبيرة».',
      },
      {
        target_category: 'التذكير والتأنيث',
        difficulty,
        exercise_type: 'correction',
        instruction_ar: 'صحح الجملة.',
        question: 'اشتريتُ كتابًا جديدة.',
        options: null,
        correct_answer: 'اشتريتُ كتابًا جديدًا.',
        explanation_ar:
          'كلمة «كتاب» مذكر، لذلك الصفة الصحيحة «جديدًا».',
      },
      {
        target_category: 'التذكير والتأنيث',
        difficulty,
        exercise_type: 'multiple_choice',
        instruction_ar: 'اختر الجملة الصحيحة.',
        question: 'أي جملة صحيحة؟',
        options: [
          'هذا كتابٌ جديدٌ.',
          'هذا كتابٌ جديدةٌ.',
          'هذه كتابٌ جديدٌ.',
        ],
        correct_answer: 'هذا كتابٌ جديدٌ.',
        explanation_ar:
          '«كتاب» اسم مذكر، لذلك نقول «هذا كتابٌ جديدٌ».',
      },
    ],
  };
}

function extractLearnerText(userPrompt: string): string {
  const marker = "Learner's Arabic writing submission:";

  const index = userPrompt.indexOf(marker);

  if (index === -1) {
    return userPrompt;
  }

  return userPrompt.slice(index + marker.length).trim();
}

/**
 * Normalize learner Arabic before deterministic matching.
 *
 * This intentionally removes tashkeel and Quranic-style combining
 * marks so the same diagnostic rules work for both:
 *
 *   ذهبت في المسجد
 *   ذَهَبْتُ فِي الْمَسْجِدِ
 *
 * It also removes tatweel and normalizes common spacing noise.
 */
function normalizeArabicForMatching(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/ـ/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
