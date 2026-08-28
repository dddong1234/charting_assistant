import type { NursingNote } from '../domain/charting'
import './components.css'

interface NursingNoteCardProps {
  note: NursingNote
}

export function NursingNoteCard({ note }: NursingNoteCardProps) {
  return (
    <article
      aria-label={`${note.timestamp} ${note.category} 간호기록`}
      className="nursing-note-card"
    >
      <header className="nursing-note-card__header">
        <span className="nursing-note-card__metadata">
          <time className="nursing-note-card__time">{note.timestamp}</time>
          <span className="nursing-note-card__category">SOAP · {note.category}</span>
        </span>
        <span className="nursing-note-card__signature">{note.nurseSignature} · 서명 완료</span>
      </header>
      <p className="nursing-note-card__narrative">{note.narrative}</p>
    </article>
  )
}
