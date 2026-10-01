import './loading.css';

/** The Mettus mark's five bars, in the brand gradient. */
export function LoadingMark({ size = 96 }: { size?: number }) {
  const bars = [80, 62, 45, 62, 80];
  return (
    <svg className="mt-loader" width={size} height={(size * 80) / 118} viewBox="0 0 118 80" aria-hidden="true">
      <defs>
        <linearGradient id="mt-loader-fill" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="118" y2="0">
          <stop offset="0" stopColor="#3ff0dc" />
          <stop offset="1" stopColor="#164df2" />
        </linearGradient>
      </defs>
      {bars.map((h, i) => (
        <rect key={i} className="mt-loader-bar" style={{ animationDelay: `${i * 0.13}s` }} x={i * 26} y={(80 - h) / 2} width="14" height={h} rx="7" fill="url(#mt-loader-fill)" />
      ))}
    </svg>
  );
}

/** Full-screen loading state: the Mettus mark, animated, with what is happening underneath. */
export function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="mt-loading" role="status" aria-live="polite">
      <LoadingMark />
      <p>{label}</p>
    </div>
  );
}
