export type NoteCategory = 'V/S' | 'PRN' | '일반'

export type PatientStatus = 'stable' | 'watch' | 'danger'

export interface NursingNote {
  id: string
  timestamp: string
  category: NoteCategory
  narrative: string
  nurseSignature: string
}

export interface Evidence {
  id: string
  timestamp: string
  category: NoteCategory
  label: string
  detail: string
  state: '확인됨' | '최근'
}

export interface Suggestion {
  id: string
  category: NoteCategory
  completion: string
  evidenceIds: string[]
}

export interface Patient {
  id: string
  bed: string
  name: string
  sex: 'F' | 'M'
  age: number
  service: '일반외과'
  surgery: string
  postoperativeDay: number
  status: PatientStatus
  isSynthetic: true
  notes: NursingNote[]
  evidence: Evidence[]
}

export interface DraftValidation {
  valid: boolean
  errors: string[]
}

const validTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const soapLabels = ['S', 'O', 'A', 'P'] as const
const unsafeSuggestionPattern = /진단|처방|오더|권고|diagnos|order|recommend/i

export function parseTime(timestamp: string): number | null {
  if (!validTime.test(timestamp)) {
    return null
  }

  const [hours, minutes] = timestamp.split(':').map(Number)
  return hours * 60 + minutes
}

export function insertChronologically(notes: NursingNote[], newNote: NursingNote): NursingNote[] {
  return [...notes, newNote].sort((left, right) => {
    const rightTime = parseTime(right.timestamp)
    const leftTime = parseTime(left.timestamp)

    if (rightTime !== null && leftTime !== null && rightTime !== leftTime) {
      return rightTime - leftTime
    }

    if (rightTime !== null && leftTime === null) {
      return -1
    }

    if (rightTime === null && leftTime !== null) {
      return 1
    }

    return left.id.localeCompare(right.id)
  })
}

export function validateDraft(draft: Pick<NursingNote, 'timestamp' | 'narrative'>): DraftValidation {
  const errors: string[] = []

  if (parseTime(draft.timestamp) === null) {
    errors.push('유효한 HH:mm 시간을 입력하세요.')
  }

  if (!draft.narrative.trim()) {
    errors.push('SOAP 간호기록을 입력하세요.')
  } else if (!hasOrderedSoapLines(draft.narrative)) {
    errors.push('S:, O:, A:, P:를 각각 줄 시작에 순서대로 입력하세요.')
  }

  return { valid: errors.length === 0, errors }
}

export function getSuggestion(category: NoteCategory, evidence: Evidence[]): Suggestion | null {
  const supportingEvidence = evidence.filter(
    (item) => item.category === category && !unsafeSuggestionPattern.test(item.detail),
  )

  if (supportingEvidence.length === 0) {
    return null
  }

  return {
    id: `suggestion-${category}`,
    category,
    completion: supportingEvidence.map((item) => item.detail).join(' '),
    evidenceIds: supportingEvidence.map((item) => item.id),
  }
}

function hasOrderedSoapLines(narrative: string): boolean {
  const labels = Array.from(narrative.matchAll(/^([SOAP]):/gm), (match) => match[1])
  return soapLabels.every((label, index) => labels[index] === label)
}
