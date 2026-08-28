import type { Patient } from '../domain/charting'
import { StatusChip } from './StatusChip'
import './components.css'

interface PatientListItemProps {
  onSelect: (patientId: Patient['id']) => void
  patient: Patient
  selected: boolean
}

export function PatientListItem({ onSelect, patient, selected }: PatientListItemProps) {
  return (
    <button
      aria-pressed={selected}
      className="patient-list-item"
      data-acuity={patient.status}
      data-selected={selected}
      onClick={() => onSelect(patient.id)}
      type="button"
    >
      <span className="patient-list-item__header">
        <span className="patient-list-item__bed">{patient.bed}</span>
        <StatusChip tone={patient.status} />
      </span>
      <span className="patient-list-item__identity">
        {patient.name} · {patient.sex}/{patient.age} · POD#{patient.postoperativeDay}
      </span>
      <span className="patient-list-item__surgery">{patient.surgery}</span>
    </button>
  )
}
