import type { PatientStatus } from '../domain/charting'
import './components.css'

export type StatusTone = PatientStatus | 'ai' | 'accepted'

interface StatusChipProps {
  tone: StatusTone
}

const statusLabels: Record<StatusTone, string> = {
  stable: '안정',
  watch: '주의',
  danger: '즉시 검토',
  ai: 'AI 제안',
  accepted: 'AI 문장 채택됨',
}

export function StatusChip({ tone }: StatusChipProps) {
  return <span className={`status-chip status-chip--${tone}`}>{statusLabels[tone]}</span>
}
