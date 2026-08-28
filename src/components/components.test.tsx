import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Evidence, NursingNote, Patient } from '../domain/charting'
import { Button } from './Button'
import { EvidenceItem } from './EvidenceItem'
import { KeyboardHint } from './KeyboardHint'
import { NursingNoteCard } from './NursingNoteCard'
import { PatientListItem } from './PatientListItem'
import { StatusChip } from './StatusChip'

const patient: Patient = {
  id: 'patient-1203-2',
  bed: '1203-2',
  name: '김○○',
  sex: 'F',
  age: 68,
  service: '일반외과',
  surgery: '복강경 우측 결장절제술',
  postoperativeDay: 2,
  status: 'watch',
  isSynthetic: true,
  notes: [],
  evidence: [],
}

const evidence: Evidence = {
  id: 'evidence-vitals-1420',
  timestamp: '14:20',
  category: 'V/S',
  label: '활력징후',
  detail: 'BP 118/72 · HR 78 · BT 36.8°C',
  subjective: '특이 호소 없음.',
  state: '최근',
}

const note: NursingNote = {
  id: 'note-2130',
  timestamp: '21:30',
  category: 'PRN',
  narrative:
    'S: 잠이 안 온다고 호소함.\nO: 의식 명료하며 수면 어려움 호소함.\nA: 수면 어려움이 지속되는 상태로 사정함.\nP: 투약 후 효과 관찰 예정임.',
  nurseSignature: 'RN 김하늘',
  signatureState: 'signed-fixture',
}

afterEach(cleanup)

describe('clinical UI components', () => {
  it('exposes a native button with its accessible label and disabled state', () => {
    const onClick = vi.fn()

    render(
      <Button disabled onClick={onClick} variant="primary">
        기록 추가
      </Button>,
    )

    const button = screen.getByRole('button', { name: '기록 추가' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it.each([
    ['stable', '안정'],
    ['watch', '주의'],
    ['danger', '즉시 검토'],
    ['ai', 'AI 제안'],
    ['accepted', 'AI 문장 채택됨'],
  ] as const)('renders the %s status with visible Korean text', (tone, label) => {
    render(<StatusChip tone={tone} />)

    expect(screen.getByText(label)).toBeVisible()
  })

  it('is a selectable patient control with selected and acuity semantics', () => {
    const onSelect = vi.fn()

    render(<PatientListItem patient={patient} selected onSelect={onSelect} />)

    const control = screen.getByRole('button', { name: /1203-2.*김○○/ })
    expect(control).toHaveAttribute('aria-pressed', 'true')
    expect(within(control).getByText('주의')).toBeVisible()

    fireEvent.click(control)
    expect(onSelect).toHaveBeenCalledWith(patient.id)
  })

  it('shows source provenance and a separate label for suggestion linkage', () => {
    const { container } = render(
      <EvidenceItem
        evidence={evidence}
        linkageLabel="현재 자동완성 근거"
        provenance="간호기록 > Vital sign"
      />,
    )

    const item = container.querySelector('.evidence-item')
    expect(item).not.toBeNull()
    expect(within(item as HTMLElement).getByText('활력징후 · 14:20')).toBeVisible()
    expect(within(item as HTMLElement).getByText(evidence.detail)).toBeVisible()
    expect(within(item as HTMLElement).getByText('간호기록 > Vital sign')).toBeVisible()
    expect(within(item as HTMLElement).getByText('최근')).toBeVisible()
    expect(within(item as HTMLElement).getByText('현재 자동완성 근거')).toBeVisible()
  })

  it('shows an unlinked evidence record source state without relabeling it as unsafe', () => {
    const { container } = render(
      <EvidenceItem
        evidence={{ ...evidence, state: '확인됨' }}
        provenance="간호기록 > Vital sign"
      />,
    )

    const item = container.querySelector('.evidence-item') as HTMLElement
    expect(within(item).getByText('확인됨')).toBeVisible()
    expect(within(item).queryByText('확인 필요')).not.toBeInTheDocument()
    expect(within(item).queryByText('현재 자동완성 근거')).not.toBeInTheDocument()
  })

  it.each([
    ['accept', 'Tab', '채택'],
    ['dismiss', 'Esc', '닫기'],
  ] as const)('pairs the %s keycap with readable action text', (action, key, label) => {
    render(<KeyboardHint action={action} />)

    expect(screen.getByText(key).tagName).toBe('KBD')
    expect(screen.getByText(label)).toBeVisible()
  })

  it('renders one unified SOAP narrative block with line breaks preserved', () => {
    const { container } = render(<NursingNoteCard note={note} />)

    const card = screen.getByRole('article', { name: '21:30 PRN 간호기록' })
    expect(within(card).getByText('SOAP · PRN')).toBeVisible()
    expect(within(card).getByText('RN 김하늘 · 서명 완료')).toBeVisible()
    expect(container.querySelectorAll('.nursing-note-card__narrative')).toHaveLength(1)
    expect(container.querySelector('.nursing-note-card__narrative')?.textContent).toBe(note.narrative)
  })

  it('labels a newly added demo note as saved but unsigned', () => {
    render(<NursingNoteCard note={{ ...note, signatureState: 'unsigned-demo' }} />)

    const card = screen.getByRole('article', { name: '21:30 PRN 간호기록' })
    expect(within(card).getByText('데모 저장 · 서명 전')).toBeVisible()
    expect(within(card).queryByText(/서명 완료/)).not.toBeInTheDocument()
  })
})
