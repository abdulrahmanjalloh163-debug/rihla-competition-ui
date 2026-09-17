export function ProgressRing({
  value,
  label,
  size = 92,
}: {
  value: number;
  label?: string;
  size?: number;
}) {
  const safe = Math.max(
    0,
    Math.min(
      100,
      Math.round(value)
    )
  );

  const toArabicNumber = (
    value: number | string
  ) =>
    String(value).replace(
      /\d/g,
      (digit) =>
        '٠١٢٣٤٥٦٧٨٩'[
          Number(digit)
        ]
    );

  return (
    <div
      className="progress-ring"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(
          var(--cyan) ${safe * 3.6}deg,
          rgba(86,119,164,.18) 0deg
        )`,
      }}
      aria-label={`${safe}%`}
    >
      <div className="progress-ring-inner">
        <strong dir="ltr">
          {toArabicNumber(safe)}
          <span>٪</span>
        </strong>

        {label && (
          <small>{label}</small>
        )}
      </div>
    </div>
  );
}