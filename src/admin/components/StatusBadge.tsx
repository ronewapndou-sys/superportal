import { Pill, type PillTone } from '../../ui'

const tones: Record<string, PillTone> = { Active: 'green', Disabled: 'red', Suspended: 'amber' }

/** Status label, using the same uniform label box as the rest of Mettus Central. */
export default function StatusBadge({ status }: { status: string }) {
  return <Pill tone={tones[status] ?? 'grey'}>{status}</Pill>
}
