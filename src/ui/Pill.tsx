export type PillTone = 'green' | 'grey' | 'red' | 'amber';

/** Status pill. Always pass the status word: colour is never the only signal. */
export function Pill({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}
