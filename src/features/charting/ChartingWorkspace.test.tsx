import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ChartingWorkspace } from './ChartingWorkspace'

afterEach(cleanup)

describe('ChartingWorkspace', () => {
  it('seeds the V/S draft with reviewed synthetic subjective text instead of a TODO marker', () => {
    render(<ChartingWorkspace />)

    const editor = screen.getByRole('textbox', { name: 'SOAP 간호기록 내용' })
    expect(editor).toHaveValue(
      'S: 특이 호소 없음.\nO: BP 128/74 mmHg, PR 76회/분, RR 18회/분, BT 36.8℃, SpO₂ 97% 확인됨.',
    )
    expect(editor).not.toHaveValue(expect.stringContaining('[간호사 확인 필요]'))
  })

  it('updates the patient context, timeline, draft, and evidence after search and selection', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    await user.type(screen.getByRole('searchbox', { name: '환자 검색' }), '박○○')
    await user.click(screen.getByRole('button', { name: /1204-1.*박○○/ }))

    expect(screen.getByRole('heading', { name: '1204-1 · 박○○ · M/54' })).toBeVisible()
    expect(screen.getByRole('article', { name: '20:00 일반 간호기록' })).toHaveTextContent(
      '복도 보행 1회 시행 후 침상 복귀함.',
    )
    expect(screen.getByRole('textbox', { name: 'SOAP 간호기록 내용' })).toHaveValue(
      'S: 수술 부위 당김감 경미하게 호소함.\nO: 보호자 동반하여 복도 보행 1회 시행 후 어지럼 호소 없이 침상 복귀함.',
    )
    expect(screen.getByLabelText('기록 분류')).toHaveValue('일반')
    expect(screen.getByLabelText('기록 시간')).toHaveValue('20:00')

    const evidencePanel = screen.getByRole('complementary', { name: '제안 근거' })
    expect(within(evidencePanel).getByText('보행 · 20:00')).toBeVisible()
    expect(
      within(evidencePanel).getByText(
        '보호자 동반하여 복도 보행 1회 시행 후 어지럼 호소 없이 침상 복귀함.',
      ),
    ).toBeVisible()
  })

  it('keeps the suggestion outside the editor value until Tab accepts it while editing', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    const editor = screen.getByRole('textbox', { name: 'SOAP 간호기록 내용' })
    const composer = screen.getByRole('region', { name: '새 SOAP 간호기록' })
    const evidencePanel = screen.getByRole('complementary', { name: '제안 근거' })
    expect(editor).toHaveValue(
      'S: 특이 호소 없음.\nO: BP 128/74 mmHg, PR 76회/분, RR 18회/분, BT 36.8℃, SpO₂ 97% 확인됨.',
    )
    expect(
      screen.getByText(
        'A: BP 128/74 mmHg, PR 76회/분, RR 18회/분, BT 36.8℃, SpO₂ 97% 확인됨.',
      ),
    ).toBeVisible()
    expect(screen.getByText('P: 상태 확인 결과를 간호사가 검토 후 기록함.')).toBeVisible()
    expect(within(evidencePanel).getByText('현재 자동완성 근거 기록 1개')).toBeVisible()
    expect(within(evidencePanel).getByText('현재 자동완성 근거')).toBeVisible()

    await user.click(editor)
    await user.keyboard('{Tab}')

    expect(editor).toHaveValue(
      'S: 특이 호소 없음.\nO: BP 128/74 mmHg, PR 76회/분, RR 18회/분, BT 36.8℃, SpO₂ 97% 확인됨.\nA: BP 128/74 mmHg, PR 76회/분, RR 18회/분, BT 36.8℃, SpO₂ 97% 확인됨.\nP: 상태 확인 결과를 간호사가 검토 후 기록함.',
    )
    expect(screen.queryByLabelText('활성 AI 제안')).not.toBeInTheDocument()
    expect(within(composer).getByText('AI 문장 채택됨')).toBeVisible()
    expect(within(composer).queryByText('Tab')).not.toBeInTheDocument()
    expect(within(composer).queryByText('Esc')).not.toBeInTheDocument()
    expect(within(evidencePanel).getByText('AI 문장 채택됨')).toBeVisible()
    expect(within(evidencePanel).getByText('채택한 AI 문장 근거 기록 1개')).toBeVisible()
    expect(within(evidencePanel).getByText('채택한 AI 문장 근거')).toBeVisible()
    const evidenceCard = within(evidencePanel).getByRole('article')
    expect(within(evidenceCard).getByText('확인됨')).toBeVisible()
    expect(within(evidencePanel).queryByText('현재 자동완성 근거')).not.toBeInTheDocument()
  })

  it('keeps the suggestion pending and moves focus normally on Shift+Tab', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    const editor = screen.getByRole('textbox', { name: 'SOAP 간호기록 내용' })
    const authoredText =
      'S: 특이 호소 없음.\nO: BP 128/74 mmHg, PR 76회/분, RR 18회/분, BT 36.8℃, SpO₂ 97% 확인됨.'

    await user.click(editor)
    await user.tab({ shift: true })

    expect(editor).toHaveValue(authoredText)
    expect(screen.getByLabelText('활성 AI 제안')).toBeVisible()
    expect(screen.getByLabelText('기록 분류')).toHaveFocus()
  })

  it('dismisses the active suggestion with Escape without changing the editor value', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    const editor = screen.getByRole('textbox', { name: 'SOAP 간호기록 내용' })
    const authoredText =
      'S: 특이 호소 없음.\nO: BP 128/74 mmHg, PR 76회/분, RR 18회/분, BT 36.8℃, SpO₂ 97% 확인됨.'
    const composer = screen.getByRole('region', { name: '새 SOAP 간호기록' })
    const evidencePanel = screen.getByRole('complementary', { name: '제안 근거' })

    await user.click(editor)
    await user.keyboard('{Escape}')

    expect(screen.queryByLabelText('활성 AI 제안')).not.toBeInTheDocument()
    expect(editor).toHaveValue(authoredText)
    expect(within(composer).queryByText('AI 제안')).not.toBeInTheDocument()
    expect(within(composer).queryByText('Tab')).not.toBeInTheDocument()
    expect(within(composer).queryByText('Esc')).not.toBeInTheDocument()
    expect(within(composer).queryByLabelText('AI 제안 키보드 동작')).not.toBeInTheDocument()
    expect(within(evidencePanel).queryByText('AI 제안')).not.toBeInTheDocument()
    expect(within(evidencePanel).getByText('활성 제안 없음')).toBeVisible()
    expect(within(evidencePanel).queryAllByRole('article')).toHaveLength(0)

    await user.click(within(evidencePanel).getByRole('button', { name: '근거 전체 보기' }))

    const vitalsEvidence = within(evidencePanel).getByRole('article', {
      name: '14:00 V/S 14:00 근거',
    })
    expect(within(vitalsEvidence).getByText('확인됨')).toBeVisible()
    for (const accessibleName of ['배액관 18:00 근거', '식이 19:00 근거']) {
      const confirmedEvidence = within(evidencePanel).getByRole('article', {
        name: accessibleName,
      })
      expect(within(confirmedEvidence).getByText('확인됨')).toBeVisible()
      expect(within(confirmedEvidence).queryByText('확인 필요')).not.toBeInTheDocument()
    }
    expect(within(evidencePanel).queryByText('현재 자동완성 근거')).not.toBeInTheDocument()
  })

  it('adds one valid unified note first in the reverse-chronological timeline', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    const narrative =
      'S: 복부 불편감이 줄었다고 말함.\nO: 침상에서 편안한 자세로 휴식 중임.\nA: 안위 상태를 간호사가 확인함.\nP: 상태 확인 내용을 이어서 기록함.'
    const editor = screen.getByRole('textbox', { name: 'SOAP 간호기록 내용' })
    const timeInput = screen.getByLabelText('기록 시간')

    await user.selectOptions(screen.getByLabelText('기록 분류'), 'PRN')
    await user.clear(timeInput)
    await user.type(timeInput, '22:10')
    await user.clear(editor)
    await user.type(editor, narrative)
    await user.click(screen.getByRole('button', { name: '기록 추가' }))

    const timeline = screen.getByRole('region', { name: '오늘 간호기록' })
    const notes = within(timeline).getAllByRole('article')
    expect(notes).toHaveLength(3)
    expect(notes[0]).toHaveAccessibleName('22:10 PRN 간호기록')
    expect(notes[0]).toHaveTextContent('SOAP · PRN')
    expect(notes[0]).toHaveTextContent('복부 불편감이 줄었다고 말함.')
    expect(screen.getByRole('status')).toHaveTextContent('22:10 SOAP 간호기록 1건을 추가했습니다.')
  })

  it('retains an invalid draft and focuses actionable validation feedback', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    const editor = screen.getByRole('textbox', { name: 'SOAP 간호기록 내용' })
    await user.clear(editor)
    await user.type(editor, 'O: 객관적 사실만 입력함.')
    await user.click(screen.getByRole('button', { name: '기록 추가' }))

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('S:, O:, A:, P:를 각각 줄 시작에 순서대로 입력하세요.')
    expect(alert).toHaveFocus()
    expect(editor).toHaveValue('O: 객관적 사실만 입력함.')

    const timeline = screen.getByRole('region', { name: '오늘 간호기록' })
    expect(within(timeline).getAllByRole('article')).toHaveLength(2)
  })

  it('blocks a complete SOAP draft that still contains a nurse-review marker', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    const editor = screen.getByRole('textbox', { name: 'SOAP 간호기록 내용' })
    await user.clear(editor)
    await user.click(editor)
    await user.paste(
      'S: [간호사 확인 필요]\nO: V/S 확인됨.\nA: 상태 관찰함.\nP: 경과 관찰함.',
    )
    await user.click(screen.getByRole('button', { name: '기록 추가' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      '대괄호로 남긴 간호사 확인 필요/TODO 표시를 해결하세요.',
    )
    const timeline = screen.getByRole('region', { name: '오늘 간호기록' })
    expect(within(timeline).getAllByRole('article')).toHaveLength(2)
  })

  it('filters the patient rail to watch and danger patients and restores all patients', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    const patientRail = screen.getByRole('navigation', { name: '환자 목록' })
    await user.click(within(patientRail).getByRole('button', { name: '확인 필요 3' }))

    expect(within(patientRail).getAllByRole('button', { name: /POD#/ })).toHaveLength(3)
    expect(within(patientRail).getByRole('button', { name: /1203-2.*김○○/ })).toBeVisible()
    expect(within(patientRail).getByRole('button', { name: /1204-2.*이○○/ })).toBeVisible()
    expect(within(patientRail).getByRole('button', { name: /1206-1.*한○○/ })).toBeVisible()
    expect(within(patientRail).queryByRole('button', { name: /1204-1.*박○○/ })).not.toBeInTheDocument()

    await user.click(within(patientRail).getByRole('button', { name: '전체 6' }))
    expect(within(patientRail).getAllByRole('button', { name: /POD#/ })).toHaveLength(6)
  })

  it('searches the patient rail by bed number', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    const patientRail = screen.getByRole('navigation', { name: '환자 목록' })
    await user.type(within(patientRail).getByRole('searchbox', { name: '환자 검색' }), '1205-2')

    const patientControls = within(patientRail).getAllByRole('button', { name: /POD#/ })
    expect(patientControls).toHaveLength(1)
    expect(patientControls[0]).toHaveAccessibleName(/1205-2.*정○○/)
  })

  it('confirms draft save without changing the current editor content', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    const editor = screen.getByRole('textbox', { name: 'SOAP 간호기록 내용' })
    await user.type(editor, ' 확인 중')
    const currentDraft =
      'S: 특이 호소 없음.\nO: BP 128/74 mmHg, PR 76회/분, RR 18회/분, BT 36.8℃, SpO₂ 97% 확인됨. 확인 중'

    await user.click(screen.getByRole('button', { name: '임시 저장' }))

    expect(screen.getByRole('status')).toHaveTextContent(
      '1203-2 환자의 작성 중인 기록을 임시 저장했습니다.',
    )
    expect(editor).toHaveValue(currentDraft)
  })

  it('confirms the current patient record set save with its exact count', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    await user.click(screen.getByRole('button', { name: '기록 저장' }))

    expect(screen.getByRole('status')).toHaveTextContent(
      '1203-2 환자의 간호기록 2건을 저장했습니다.',
    )
  })

  it('expands the current suggestion evidence in place', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    const evidencePanel = screen.getByRole('complementary', { name: '제안 근거' })
    expect(within(evidencePanel).getAllByRole('article')).toHaveLength(1)
    expect(within(evidencePanel).getByText('14:00 V/S · 14:00')).toBeVisible()
    expect(within(evidencePanel).queryByText('배액관 · 18:00')).not.toBeInTheDocument()

    await user.click(within(evidencePanel).getByRole('button', { name: '근거 전체 보기' }))

    expect(within(evidencePanel).getAllByRole('article')).toHaveLength(4)
    expect(within(evidencePanel).getByText('배액관 · 18:00')).toBeVisible()
    expect(within(evidencePanel).getByRole('button', { name: '근거 접기' })).toBeVisible()
  })

  it('dismisses a stale suggestion when the nurse continues typing without committing it', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    const editor = screen.getByRole('textbox', { name: 'SOAP 간호기록 내용' })
    await user.type(editor, ' 직접 확인 중')

    expect(screen.queryByLabelText('활성 AI 제안')).not.toBeInTheDocument()
    expect(editor).toHaveValue(
      'S: 특이 호소 없음.\nO: BP 128/74 mmHg, PR 76회/분, RR 18회/분, BT 36.8℃, SpO₂ 97% 확인됨. 직접 확인 중',
    )
    expect((editor as HTMLTextAreaElement).value).not.toContain('A: BP 128/74 mmHg')

    const composer = screen.getByRole('region', { name: '새 SOAP 간호기록' })
    const evidencePanel = screen.getByRole('complementary', { name: '제안 근거' })
    expect(within(composer).queryByText('AI 제안')).not.toBeInTheDocument()
    expect(within(composer).queryByText('Tab')).not.toBeInTheDocument()
    expect(within(evidencePanel).getByText('활성 제안 없음')).toBeVisible()
    expect(within(evidencePanel).queryAllByRole('article')).toHaveLength(0)
  })

  it('keeps category-specific suggestion copy aligned with its evidence source', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    await user.selectOptions(screen.getByLabelText('기록 분류'), 'PRN')

    expect(
      screen.getByText(
        'A: 복부 통증 NRS 5점 호소하여 PRN 진통제 투약 후 침상 안정 중임.',
      ),
    ).toBeVisible()
    const evidencePanel = screen.getByRole('complementary', { name: '제안 근거' })
    expect(within(evidencePanel).getByText('21:30 PRN · 21:30')).toBeVisible()
    expect(within(evidencePanel).queryByText('14:00 V/S · 14:00')).not.toBeInTheDocument()
  })

  it('shows no AI affordances or linkage for a category without evidence', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    await user.type(screen.getByRole('searchbox', { name: '환자 검색' }), '1204-1')
    await user.click(screen.getByRole('button', { name: /1204-1.*박○○/ }))
    await user.selectOptions(screen.getByLabelText('기록 분류'), 'V/S')

    const composer = screen.getByRole('region', { name: '새 SOAP 간호기록' })
    const evidencePanel = screen.getByRole('complementary', { name: '제안 근거' })
    expect(screen.getByRole('textbox', { name: 'SOAP 간호기록 내용' })).toHaveValue(
      'S: \nO: ',
    )
    expect(screen.queryByLabelText('활성 AI 제안')).not.toBeInTheDocument()
    expect(within(composer).queryByText(/AI 제안|AI 문장 채택됨/)).not.toBeInTheDocument()
    expect(within(composer).queryByText('Tab')).not.toBeInTheDocument()
    expect(within(composer).queryByText('Esc')).not.toBeInTheDocument()
    expect(within(evidencePanel).getByText('활성 제안 없음')).toBeVisible()
    expect(within(evidencePanel).queryAllByRole('article')).toHaveLength(0)

    await user.click(within(evidencePanel).getByRole('button', { name: '근거 전체 보기' }))

    const browsedEvidence = within(evidencePanel).getByRole('article', {
      name: '보행 20:00 근거',
    })
    expect(within(browsedEvidence).getByText('최근')).toBeVisible()
    expect(within(browsedEvidence).queryByText(/자동완성 근거|채택한 AI 문장 근거/)).not.toBeInTheDocument()
  })

  it('replaces an accepted completion with the selected category draft before adding', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    const editor = screen.getByRole('textbox', { name: 'SOAP 간호기록 내용' })
    await user.click(editor)
    await user.keyboard('{Tab}')
    expect(editor).toHaveValue(
      'S: 특이 호소 없음.\nO: BP 128/74 mmHg, PR 76회/분, RR 18회/분, BT 36.8℃, SpO₂ 97% 확인됨.\nA: BP 128/74 mmHg, PR 76회/분, RR 18회/분, BT 36.8℃, SpO₂ 97% 확인됨.\nP: 상태 확인 결과를 간호사가 검토 후 기록함.',
    )

    await user.selectOptions(screen.getByLabelText('기록 분류'), 'PRN')

    const prnSeed =
      'S: 복부 통증 NRS 5점 호소함.\nO: 복부 통증 NRS 5점 호소하여 PRN 진통제 투약 후 침상 안정 중임.'
    expect(editor).toHaveValue(prnSeed)
    expect(screen.getByLabelText('기록 시간')).toHaveValue('21:30')
    expect(screen.getByText('21:30 PRN · 21:30')).toBeVisible()

    await user.click(editor)
    await user.keyboard('{Tab}')
    expect(editor).toHaveValue(
      `${prnSeed}\nA: 복부 통증 NRS 5점 호소하여 PRN 진통제 투약 후 침상 안정 중임.\nP: 상태 확인 결과를 간호사가 검토 후 기록함.`,
    )
    await user.click(screen.getByRole('button', { name: '기록 추가' }))

    const timeline = screen.getByRole('region', { name: '오늘 간호기록' })
    expect(within(timeline).getAllByRole('article')).toHaveLength(3)
    const sameMinuteNotes = within(timeline).getAllByRole('article', {
      name: '21:30 PRN 간호기록',
    })
    expect(sameMinuteNotes).toHaveLength(2)
    expect(within(sameMinuteNotes[0]).getByText('데모 저장 · 서명 전')).toBeVisible()
    expect(sameMinuteNotes[0]).toHaveTextContent('S: 복부 통증 NRS 5점 호소함.')
    expect(sameMinuteNotes[0]).not.toHaveTextContent('[간호사 확인 필요]')
    expect(within(sameMinuteNotes[1]).getByText('간호사 이○○ · 서명 완료')).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('21:30 SOAP 간호기록 1건을 추가했습니다.')
  })
})
