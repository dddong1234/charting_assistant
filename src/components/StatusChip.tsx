import type { PatientStatus } from '../domain/charting'
import './components.css'

export type StatusTone = PatientStatus | 'ai' | 'linked' | 'review'

interface StatusChipProps {
  tone: StatusTone
}

const statusLabels: Record<StatusTone, string> = {
  stable: '안정',
  watch: '주의',
  danger: '즉시 검토',
  ai: 'AI 제안',
  linked: '연결됨',
  review: '확인 필요',
}

export function StatusChip({ tone }: StatusChipProps) {
  return <span className={`status-chip status-chip--${tone}`}>{statusLabels[tone]}</span>
}
