'use client';

import Link from 'next/link';
import { useStoredLearnerId } from '../lib/ui/learnerSession';

export default function Home() {
  const learnerId = useStoredLearnerId();
  const primaryHref = learnerId
    ? `/practice?learnerId=${encodeURIComponent(learnerId)}`
    : '/auth';

  return (
    <main className="page hero" dir="rtl">
      <span className="ai-chip"><i /> مدعوم بالذكاء الاصطناعي</span>
      <div className="hero-orbit" aria-hidden="true"><span /><span /></div>
      <h1><span>نظام ذكيّ تكيّفيّ لتعلّم اللغة العربية</span></h1>
      <p>يتعلّم من أدائك، ويكتشف نقاط ضعفك، ويحدّد ما تحتاجه بعد ذلك — لتصبح كل خطوة في تعلّم العربية مصمّمة لك.</p>
      <Link href={primaryHref} className="gradient-button">
        {learnerId ? 'تابع رحلتك' : 'ابدأ رحلتك'} <span aria-hidden="true">←</span>
      </Link>

      <section className="steps" aria-label="كيف تعمل رِحلة">
        <article className="step-card"><div className="step-num">١</div><strong>حلّل أداءك</strong><small>اكتب بالعربية، ورِحلة تلتقط الأنماط المهمة في أدائك.</small></article>
        <article className="step-card"><div className="step-num">٢</div><strong>اكتشف نقاط ضعفك</strong><small>لا نحكم من خطأ واحد؛ نراقب النمط والأدلة المتكررة.</small></article>
        <article className="step-card"><div className="step-num">٣</div><strong>ابنِ تدريبك الشخصي</strong><small>تتغيّر التمارين والصعوبة مع تقدّمك الحقيقي.</small></article>
      </section>
    </main>
  );
}
