import type { Evidence } from '../domain/charting'
import { StatusChip } from './StatusChip'
import './components.css'

interface EvidenceItemProps {
  evidence: Evidence
  linked: boolean
  provenance: string
}

export function EvidenceItem({ evidence, linked, provenance }: EvidenceItemProps) {
  return (
    <article
      aria-label={`${evidence.label} ${evidence.timestamp} 근거`}
      className="evidence-item"
      data-state={linked ? 'linked' : 'watch'}
    >
      <header className="evidence-item__header">
        <span>
          {evidence.label} · {evidence.timestamp}
        </span>
        <StatusChip tone={linked ? 'linked' : 'review'} />
      </header>
      <p className="evidence-item__detail">{evidence.detail}</p>
      <p className="evidence-item__provenance">{provenance}</p>
    </article>
  )
}
