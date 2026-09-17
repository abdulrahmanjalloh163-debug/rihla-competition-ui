export function ConfidenceMeter({ value }: { value: number }) {
  const level = value >= 0.9 ? 3 : value >= 0.7 ? 2 : 1;
  return (
    <span className="confidence-meter" title={`ثقة التحليل ${Math.round(value * 100)}%`}>
      <span className="confidence-label">الثقة</span>
      <span className="confidence-bars" aria-hidden="true">
        {[1, 2, 3].map((bar) => (
          <i key={bar} className={bar <= level ? 'active' : ''} />
        ))}
      </span>
    </span>
  );
}
