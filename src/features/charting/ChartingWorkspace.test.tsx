import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ChartingWorkspace } from './ChartingWorkspace'

afterEach(cleanup)

const initialFacts = '잠이 안 온다고 호소함. V/S 안정적. PRN 수면제 처방 확인함.'
const acceptedSleepSoap =
  'S: “잠이 안 온다”고 호소함.\nO: BP 110/70 mmHg, HR 80회/분, RR 18회/분, BT 36.5℃, SpO₂ 98% 확인됨.\nA: 수면 불편 호소 상태를 간호사가 확인함.\nP: Dr. 박지훈 처방에 따라 Stilnox 10mg PO 투약함.'
const renderedSleepSoap = acceptedSleepSoap.replaceAll('\n', ' ')

describe('ChartingWorkspace', () => {
  it('seeds the editor with source facts instead of prewritten SOAP labels', () => {
    render(<ChartingWorkspace />)

    const editor = screen.getByRole('textbox', { name: '간호 사실 입력' })
    expect(editor).toHaveValue(initialFacts)
    expect(editor).not.toHaveValue(expect.stringMatching(/(^|\n)[SOAP]:/))
    expect(editor).not.toHaveValue(expect.stringContaining('[간호사 확인 필요]'))
  })

  it('lets a visitor apply a supported nursing example and continue editing', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    const examples = screen.getByRole('region', { name: '작성 예시' })
    const editor = screen.getByRole('textbox', { name: '간호 사실 입력' })

    expect(within(examples).getByText('어떤 내용을 쓸 수 있나요?')).toBeVisible()
    expect(within(examples).getByText('체험용 문장을 선택해 시작하세요')).toBeVisible()

    await user.click(within(examples).getByRole('button', { name: '통증 3점 입력' }))

    expect(editor).toHaveValue('통증 3점')
    expect(editor).toHaveFocus()
    expect(screen.getByLabelText('활성 통합 SOAP 제안')).toHaveTextContent(
      'S: 통증 NRS 3점이라고 말함.',
    )
  })

  it('expands and collapses additional supported nursing examples', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    const examples = screen.getByRole('region', { name: '작성 예시' })
    const toggle = within(examples).getByRole('button', { name: '예시 더보기' })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(within(examples).queryByRole('button', { name: '숨찬건 없음 입력' }))
      .not.toBeInTheDocument()

    await user.click(toggle)

    expect(within(examples).getByRole('button', { name: '잠 못잠 입력' })).toBeVisible()
    expect(within(examples).getByRole('button', { name: '보행 못함 입력' })).toBeVisible()
    expect(within(examples).getByRole('button', { name: '숨찬건 없음 입력' })).toBeVisible()
    expect(within(examples).getByRole('button', { name: '예시 접기' }))
      .toHaveAttribute('aria-expanded', 'true')

    await user.click(within(examples).getByRole('button', { name: '예시 접기' }))

    expect(within(examples).queryByRole('button', { name: '숨찬건 없음 입력' }))
      .not.toBeInTheDocument()
  })

  it('keeps the current PRN event out of the already-saved timeline', () => {
    render(<ChartingWorkspace />)

    const timeline = screen.getByRole('region', { name: '오늘 간호기록' })

    expect(within(timeline).queryByText(/Stilnox 10mg PO 투약함/)).not.toBeInTheDocument()
    expect(
      within(timeline).getByRole('article', { name: '19:00 일반 간호기록' }),
    ).toBeVisible()
  })

  it('updates the patient context, timeline, draft, and evidence after search and selection', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    await user.type(screen.getByRole('searchbox', { name: '환자 검색' }), '박○○')
    await user.click(screen.getByRole('button', { name: /1204-1.*박○○/ }))

    expect(screen.getByRole('heading', { name: /1204-1 · 박○○ M\/54/ })).toBeVisible()
    expect(screen.getByRole('article', { name: '20:00 일반 간호기록' })).toHaveTextContent(
      '복도 보행 1회 시행 후 침상 복귀함.',
    )
    expect(screen.getByRole('textbox', { name: '간호 사실 입력' })).toHaveValue(
      '수술 부위 당김감 경미하게 호소함. 보호자 동반하여 복도 보행 1회 시행 후 어지럼 호소 없이 침상 복귀함.',
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

    const editor = screen.getByRole('textbox', { name: '간호 사실 입력' })
    const composer = screen.getByRole('region', { name: '새 SOAP 간호기록' })
    const evidencePanel = screen.getByRole('complementary', { name: '제안 근거' })
    expect(editor).toHaveValue(initialFacts)
    expect(screen.getByLabelText('활성 통합 SOAP 제안')).toHaveTextContent(renderedSleepSoap)
    expect(within(evidencePanel).getByText('현재 자동완성 근거 기록 3개')).toBeVisible()
    expect(within(evidencePanel).getAllByText('현재 자동완성 근거')).toHaveLength(3)

    await user.click(editor)
    await user.keyboard('{Tab}')

    expect(editor).toHaveValue(acceptedSleepSoap)
    expect(screen.queryByLabelText('활성 통합 SOAP 제안')).not.toBeInTheDocument()
    expect(within(composer).getByText('AI 문장 채택됨')).toBeVisible()
    expect(within(composer).queryByText('Tab')).not.toBeInTheDocument()
    expect(within(composer).queryByText('Esc')).not.toBeInTheDocument()
    expect(within(evidencePanel).getByText('AI 문장 채택됨')).toBeVisible()
    expect(within(evidencePanel).getByText('채택한 AI 문장 근거 기록 3개')).toBeVisible()
    expect(within(evidencePanel).getAllByText('채택한 AI 문장 근거')).toHaveLength(3)
    expect(within(evidencePanel).getAllByRole('article')).toHaveLength(3)
    expect(within(evidencePanel).getAllByText('확인됨')).toHaveLength(2)
    expect(within(evidencePanel).queryByText('현재 자동완성 근거')).not.toBeInTheDocument()
  })

  it('keeps the suggestion pending and moves focus normally on Shift+Tab', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    const editor = screen.getByRole('textbox', { name: '간호 사실 입력' })
    const authoredText = initialFacts

    await user.click(editor)
    await user.tab({ shift: true })

    expect(editor).toHaveValue(authoredText)
    expect(screen.getByLabelText('활성 통합 SOAP 제안')).toBeVisible()
    expect(screen.getByRole('button', { name: '예시 더보기' })).toHaveFocus()
  })

  it('dismisses the active suggestion with Escape without changing the editor value', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    const editor = screen.getByRole('textbox', { name: '간호 사실 입력' })
    const authoredText = initialFacts
    const composer = screen.getByRole('region', { name: '새 SOAP 간호기록' })
    const evidencePanel = screen.getByRole('complementary', { name: '제안 근거' })

    await user.click(editor)
    await user.keyboard('{Escape}')

    expect(screen.queryByLabelText('활성 통합 SOAP 제안')).not.toBeInTheDocument()
    expect(editor).toHaveValue(authoredText)
    expect(within(composer).queryByText('AI 제안')).not.toBeInTheDocument()
    expect(within(composer).queryByText('Tab')).not.toBeInTheDocument()
    expect(within(composer).queryByText('Esc')).not.toBeInTheDocument()
    expect(within(composer).queryByLabelText('AI 제안 키보드 동작')).not.toBeInTheDocument()
    expect(within(evidencePanel).queryByText('AI 제안')).not.toBeInTheDocument()
    expect(within(evidencePanel).getByText('활성 제안 없음')).toBeVisible()
    expect(within(evidencePanel).queryAllByRole('article')).toHaveLength(0)

    await user.click(within(evidencePanel).getByRole('button', { name: '근거 전체 보기' }))

    const patientStatementEvidence = within(evidencePanel).getByRole('article', {
      name: '환자 진술 21:30 근거',
    })
    expect(within(patientStatementEvidence).getByText('최근')).toBeVisible()
    for (const accessibleName of [
      'PRN 투약 · Dr. 박지훈 처방 18:12 근거',
      '최근 V/S 21:35 근거',
      '배액관 18:00 근거',
      '식이 19:00 근거',
    ]) {
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
    const editor = screen.getByRole('textbox', { name: '간호 사실 입력' })
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

    const editor = screen.getByRole('textbox', { name: '간호 사실 입력' })
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

    const editor = screen.getByRole('textbox', { name: '간호 사실 입력' })
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

    const editor = screen.getByRole('textbox', { name: '간호 사실 입력' })
    await user.type(editor, ' 확인 중')
    const currentDraft = `${initialFacts} 확인 중`

    await user.click(screen.getByRole('button', { name: '임시 저장' }))

    expect(screen.getByRole('status', { name: '저장 결과' })).toHaveTextContent(
      '1203-2 환자의 작성 중인 기록을 임시 저장했습니다.',
    )
    expect(editor).toHaveValue(currentDraft)
  })

  it('confirms the current patient record set save with its exact count', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    await user.click(screen.getByRole('button', { name: '기록 저장' }))

    expect(screen.getByRole('status', { name: '저장 결과' })).toHaveTextContent(
      '1203-2 환자의 간호기록 2건을 저장했습니다.',
    )
  })

  it('expands the current suggestion evidence in place', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    const evidencePanel = screen.getByRole('complementary', { name: '제안 근거' })
    expect(within(evidencePanel).getAllByRole('article')).toHaveLength(3)
    expect(within(evidencePanel).getByText('환자 진술 · 21:30')).toBeVisible()
    expect(within(evidencePanel).getByText('최근 V/S · 21:35')).toBeVisible()
    expect(within(evidencePanel).queryByText('배액관 · 18:00')).not.toBeInTheDocument()

    await user.click(within(evidencePanel).getByRole('button', { name: '근거 전체 보기' }))

    expect(within(evidencePanel).getAllByRole('article')).toHaveLength(5)
    expect(within(evidencePanel).getByText('배액관 · 18:00')).toBeVisible()
    expect(within(evidencePanel).getByRole('button', { name: '근거 접기' })).toBeVisible()
  })

  it('keeps the suggestion active when the nurse deletes one character from the fact input', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    const editor = screen.getByRole('textbox', { name: '간호 사실 입력' })
    await user.click(editor)
    await user.keyboard('{Backspace}')

    expect(editor).toHaveValue(initialFacts.slice(0, -1))
    expect(screen.getByLabelText('활성 통합 SOAP 제안')).toHaveTextContent(renderedSleepSoap)

    const composer = screen.getByRole('region', { name: '새 SOAP 간호기록' })
    const evidencePanel = screen.getByRole('complementary', { name: '제안 근거' })
    expect(within(composer).getByText('AI 제안')).toBeVisible()
    expect(within(composer).getByText('Tab')).toBeVisible()
    expect(within(evidencePanel).getByText('현재 자동완성 근거 기록 3개')).toBeVisible()
    expect(within(evidencePanel).getAllByRole('article')).toHaveLength(3)
  })

  it('keeps category-specific suggestion copy aligned with its evidence source', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    await user.selectOptions(screen.getByLabelText('기록 분류'), 'PRN')

    expect(screen.getByLabelText('활성 통합 SOAP 제안')).toHaveTextContent(renderedSleepSoap)
    const evidencePanel = screen.getByRole('complementary', { name: '제안 근거' })
    expect(within(evidencePanel).getByText('환자 진술 · 21:30')).toBeVisible()
    expect(within(evidencePanel).getByText('PRN 투약 · Dr. 박지훈 처방 · 18:12')).toBeVisible()
    expect(within(evidencePanel).getByText('최근 V/S · 21:35')).toBeVisible()
  })

  it('shows no AI affordances or linkage for a category without evidence', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    await user.type(screen.getByRole('searchbox', { name: '환자 검색' }), '1204-1')
    await user.click(screen.getByRole('button', { name: /1204-1.*박○○/ }))
    await user.selectOptions(screen.getByLabelText('기록 분류'), 'V/S')

    const composer = screen.getByRole('region', { name: '새 SOAP 간호기록' })
    const evidencePanel = screen.getByRole('complementary', { name: '제안 근거' })
    expect(screen.getByRole('textbox', { name: '간호 사실 입력' })).toHaveValue('')
    expect(screen.queryByLabelText('활성 통합 SOAP 제안')).not.toBeInTheDocument()
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

    const editor = screen.getByRole('textbox', { name: '간호 사실 입력' })
    await user.click(editor)
    await user.keyboard('{Tab}')
    expect(editor).toHaveValue(acceptedSleepSoap)

    await user.selectOptions(screen.getByLabelText('기록 분류'), '일반')

    const generalSeed =
      '배액관 부위 불편감 호소 없음. JP 배액관 고정 상태 양호하며 맑은 장액성 배액 30 mL 확인됨.'
    const acceptedGeneralSoap =
      'S: 배액관 부위 불편감 호소 없음.\nO: JP 배액관 고정 상태 양호하며 맑은 장액성 배액 30 mL 확인됨.\nA: 현재 상태를 간호사가 확인함.\nP: 상태 변화 여부를 이어서 관찰함.'
    expect(editor).toHaveValue(generalSeed)
    expect(screen.getByLabelText('기록 시간')).toHaveValue('18:00')
    expect(screen.getByText('배액관 · 18:00')).toBeVisible()

    await user.click(editor)
    await user.keyboard('{Tab}')
    expect(editor).toHaveValue(acceptedGeneralSoap)
    await user.click(screen.getByRole('button', { name: '기록 추가' }))

    const timeline = screen.getByRole('region', { name: '오늘 간호기록' })
    expect(within(timeline).getAllByRole('article')).toHaveLength(3)
    const addedNote = within(timeline).getByRole('article', { name: '18:00 일반 간호기록' })
    expect(within(addedNote).getByText('데모 저장 · 서명 전')).toBeVisible()
    expect(addedNote).toHaveTextContent('S: 배액관 부위 불편감 호소 없음.')
    expect(addedNote).not.toHaveTextContent('[간호사 확인 필요]')
    expect(screen.getByRole('status')).toHaveTextContent('18:00 SOAP 간호기록 1건을 추가했습니다.')
  })
})
