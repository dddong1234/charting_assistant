import type { Evidence } from '../domain/charting'
import './components.css'

interface EvidenceItemProps {
  evidence: Evidence
  linkageLabel?: string
  provenance: string
}

export function EvidenceItem({ evidence, linkageLabel, provenance }: EvidenceItemProps) {
  return (
    <article
      aria-label={`${evidence.label} ${evidence.timestamp} 근거`}
      className="evidence-item"
      data-linked={Boolean(linkageLabel)}
    >
      <header className="evidence-item__header">
        <span>
          {evidence.label} · {evidence.timestamp}
        </span>
        <span className="evidence-item__source-state">{evidence.state}</span>
      </header>
      <p className="evidence-item__detail">{evidence.detail}</p>
      <p className="evidence-item__provenance">{provenance}</p>
      {linkageLabel ? <p className="evidence-item__linkage">{linkageLabel}</p> : null}
    </article>
  )
}
