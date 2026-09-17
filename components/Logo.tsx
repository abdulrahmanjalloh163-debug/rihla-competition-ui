import Link from 'next/link';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand-logo" aria-label="رِحلة - الرئيسية">
      <span className="brand-word">رِحلة</span>
      {!compact && <span className="brand-en">RIHLA</span>}
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-node node-a" />
        <span className="brand-node node-b" />
        <span className="brand-node node-c" />
      </span>
    </Link>
  );
}
