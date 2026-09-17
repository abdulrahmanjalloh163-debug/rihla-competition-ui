import { GlassCard } from './GlassCard';

export function LoadingState({
  title,
  detail = 'رِحلة تُجهّز تجربتك الآن',
}: {
  title: string;
  detail?: string;
}) {
  return (
    <main className="page page-narrow flow-page" dir="rtl">
      <GlassCard className="flow-card loading-state-card emphasis">
        <div className="loading-brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <span className="eyebrow">رِحلة تعمل الآن</span>
        <h2>{title}</h2>
        <p>{detail}</p>

        <div className="loading-progress" aria-hidden="true">
          <span />
        </div>

        <div className="loading-dots" aria-label="جارٍ التحميل">
          <i />
          <i />
          <i />
        </div>
      </GlassCard>
    </main>
  );
}
