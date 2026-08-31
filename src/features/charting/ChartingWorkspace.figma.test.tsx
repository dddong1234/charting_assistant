import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ChartingWorkspace } from './ChartingWorkspace'

afterEach(cleanup)

describe('ChartingWorkspace approved Figma contract', () => {
  it('starts with ordinary nursing facts while keeping the unified SOAP draft outside the editor', () => {
    render(<ChartingWorkspace />)

    const editor = screen.getByRole('textbox', { name: '간호 사실 입력' })
    expect(editor).toHaveValue(
      '잠이 안 온다고 호소함. V/S 안정적. PRN 수면제 처방 확인함.',
    )
    expect((editor as HTMLTextAreaElement).value).not.toMatch(/(^|\n)[SOAP]:/)

    const suggestion = screen.getByLabelText('활성 통합 SOAP 제안')
    expect(suggestion).toHaveTextContent('S: “잠이 안 온다”고 호소함.')
    expect(suggestion).toHaveTextContent(
      'O: BP 110/70 mmHg, HR 80회/분, RR 18회/분, BT 36.5℃, SpO₂ 98% 확인됨.',
    )
    expect(suggestion).toHaveTextContent('A: 수면 불편 호소 상태를 간호사가 확인함.')
    expect(suggestion).toHaveTextContent(
      'P: Dr. 박지훈 처방에 따라 Stilnox 10mg PO 투약함.',
    )
  })

  it('exposes the approved desktop EMR landmarks and nurse-authorship disclosure', () => {
    render(<ChartingWorkspace />)

    expect(screen.getByText('CARENOTE')).toBeVisible()
    expect(screen.getByRole('heading', { name: '담당 환자' })).toBeVisible()
    expect(screen.getByRole('heading', { name: '새 간호기록' })).toBeVisible()
    expect(screen.getByRole('heading', { name: '간호기록 타임라인' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'AI REVIEW' })).toBeVisible()
    expect(
      screen.getByText(
        'AI는 기록을 대신 서명하지 않습니다. 최종 판단과 서명은 담당 간호사에게 있습니다.',
      ),
    ).toBeVisible()
  })

  it('changes patient-specific safety and recent-event facts with the selected patient', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    await user.type(screen.getByRole('searchbox', { name: '환자 검색' }), '박○○')
    await user.click(screen.getByRole('button', { name: /1204-1.*박○○/ }))

    const patientContext = screen.getByRole('region', { name: /1204-1 · 박○○/ })
    expect(within(patientContext).getByText('수술 후 회복 관찰 · 복강경 충수절제술')).toBeVisible()
    expect(within(patientContext).getByText('● 알레르기 정보 없음')).toBeVisible()
    expect(within(patientContext).queryByText(/PENICILLIN/)).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: '최근 임상 정보' })).toHaveTextContent(
      '보행 · 보호자 동반하여 복도 보행 1회 시행 후 어지럼 호소 없이 침상 복귀함.',
    )
  })
})
