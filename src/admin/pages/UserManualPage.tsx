import { Download, FileText } from 'lucide-react'
import PageShell from '../components/PageShell'

export default function UserManualPage() {
  return (
    <PageShell title="User Manual" subtitle="Download the PDF user guide">
      <div className="flex max-w-xl items-center gap-4 rounded-card bg-subtle p-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-ctl bg-surface text-mettus"><FileText size={24} aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">XDS Portal – User Guide</div>
          <div className="text-[13px] text-sharkskin">PDF · v1.0 · September 2026</div>
        </div>
        <button type="button" className="xa-btn-primary" disabled title="Placeholder — no file is attached">
          <Download size={15} aria-hidden /> Download
        </button>
      </div>
      <p className="mt-4 text-[13px] text-sharkskin">Placeholder: no PDF is bundled with this frontend-only prototype.</p>
    </PageShell>
  )
}
