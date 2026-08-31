import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChartingWorkspace } from './ChartingWorkspace'

afterEach(cleanup)

describe('ChartingWorkspace guided demo', () => {
  it('starts automatically by telling the visitor to edit the nursing facts', () => {
    render(<ChartingWorkspace />)

    const guide = screen.getByRole('region', { name: '체험 가이드' })
    expect(within(guide).getByRole('heading', { name: '간호 사실을 한 글자 수정해보세요' })).toBeVisible()
    expect(within(guide).getByText('1 / 3')).toBeVisible()
    expect(within(guide).getByText(/백스페이스로 한 글자만 지워도/)).toBeVisible()
    expect(screen.getByRole('textbox', { name: '간호 사실 입력' })).toBeVisible()
  })

  it('advances through editing, evidence review, and Tab acceptance', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    const editor = screen.getByRole('textbox', { name: '간호 사실 입력' })
    await user.click(editor)
    await user.keyboard('{Backspace}')

    let guide = screen.getByRole('region', { name: '체험 가이드' })
    expect(within(guide).getByText('2 / 3')).toBeVisible()
    expect(within(guide).getByRole('heading', { name: 'AI 초안과 근거를 확인하세요' })).toBeVisible()
    expect(screen.getByLabelText('활성 통합 SOAP 제안')).toBeVisible()
    expect(within(screen.getByRole('complementary', { name: '제안 근거' })).getAllByRole('article')).toHaveLength(3)

    await user.click(within(guide).getByRole('button', { name: '확인했어요' }))

    guide = screen.getByRole('region', { name: '체험 가이드' })
    expect(within(guide).getByText('3 / 3')).toBeVisible()
    expect(within(guide).getByRole('heading', { name: 'Tab으로 SOAP 초안을 채택하세요' })).toBeVisible()
    expect(editor).toHaveFocus()

    await user.keyboard('{Tab}')

    expect(screen.queryByRole('region', { name: '체험 가이드' })).not.toBeInTheDocument()
    expect(editor).toHaveValue(
      'S: “잠이 안 온다”고 호소함.\nO: BP 110/70 mmHg, HR 80회/분, RR 18회/분, BT 36.5℃, SpO₂ 98% 확인됨.\nA: 수면 불편 호소 상태를 간호사가 확인함.\nP: Dr. 박지훈 처방에 따라 Stilnox 10mg PO 투약함.',
    )
  })

  it('finishes after evidence confirmation when the suggestion was accepted early', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    const editor = screen.getByRole('textbox', { name: '간호 사실 입력' })
    await user.click(editor)
    await user.keyboard('{Backspace}')
    await user.click(editor)
    await user.keyboard('{Tab}')

    const guide = screen.getByRole('region', { name: '체험 가이드' })
    expect(within(guide).getByText('2 / 3')).toBeVisible()

    await user.click(within(guide).getByRole('button', { name: '확인했어요' }))

    expect(screen.queryByRole('region', { name: '체험 가이드' })).not.toBeInTheDocument()
  })

  it('brings the evidence into view with breakpoint-neutral guidance', async () => {
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    const editor = screen.getByRole('textbox', { name: '간호 사실 입력' })
    await user.click(editor)
    await user.keyboard('{Backspace}')

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
    expect(
      within(screen.getByRole('region', { name: '체험 가이드' })).getByText(
        '파란 테두리의 근거 3건이 통합 SOAP 문장의 출처입니다.',
      ),
    ).toBeVisible()
  })

  it('can be skipped and restarted from a clean deterministic demo state', async () => {
    const user = userEvent.setup()
    render(<ChartingWorkspace />)

    const guide = screen.getByRole('region', { name: '체험 가이드' })
    await user.click(within(guide).getByRole('button', { name: '건너뛰기' }))

    expect(screen.queryByRole('region', { name: '체험 가이드' })).not.toBeInTheDocument()

    const editor = screen.getByRole('textbox', { name: '간호 사실 입력' })
    await user.click(editor)
    await user.keyboard('{Tab}')
    await user.click(screen.getByRole('button', { name: '기록 추가' }))
    await user.type(screen.getByRole('searchbox', { name: '환자 검색' }), '1204')
    await user.click(screen.getByRole('button', { name: '확인 필요 3' }))

    await user.click(screen.getByRole('button', { name: '체험 가이드' }))

    expect(within(screen.getByRole('region', { name: '체험 가이드' })).getByText('1 / 3')).toBeVisible()
    expect(screen.getByRole('searchbox', { name: '환자 검색' })).toHaveValue('')
    expect(screen.getByRole('button', { name: '전체 6' })).toHaveAttribute('aria-pressed', 'true')
    expect(editor).toHaveValue('잠이 안 온다고 호소함. V/S 안정적. PRN 수면제 처방 확인함.')
    expect(screen.getByLabelText('활성 통합 SOAP 제안')).toBeVisible()
    expect(
      within(screen.getByRole('region', { name: '오늘 간호기록' })).getAllByRole('article'),
    ).toHaveLength(2)
  })
})
