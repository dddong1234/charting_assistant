import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AiSuggestionResult } from '../../domain/aiSuggestion'
import { ChartingWorkspace } from './ChartingWorkspace'

type RequestSuggestion = (typeof import('../../services/suggestionClient'))['requestAiSuggestion']

const modelSuggestion: AiSuggestionResult = {
  source: 'model',
  narrative:
    'S: 잠이 오지 않는다고 다시 호소함.\nO: BP 110/70 mmHg, HR 80회/분, RR 18회/분, BT 36.5℃, SpO₂ 98% 확인됨.\nA: 수면 불편 호소 상태를 간호사가 확인함.\nP: Stilnox 10mg PO 투약함.',
  evidenceIds: ['kim-prn-2130', 'kim-order-1812', 'kim-vs-1400'],
}

describe('ChartingWorkspace input-grounded AI suggestions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('sends the edited nurse text after debounce while keeping the immediate fallback visible', async () => {
    const requestSuggestion = vi.fn<RequestSuggestion>(
      () => new Promise<AiSuggestionResult>(() => undefined),
    )
    render(<ChartingWorkspace requestSuggestion={requestSuggestion} />)

    const editor = screen.getByRole('textbox', { name: '간호 사실 입력' })
    fireEvent.change(editor, { target: { value: '잠이 오지 않는다고 다시 호소함.' } })

    expect(screen.getByText('AI 분석 중 · 규칙 기반 초안 유지')).toBeVisible()
    expect(screen.getByLabelText('활성 통합 SOAP 제안')).toHaveTextContent(
      'S: “잠이 안 온다”고 호소함.',
    )

    await act(() => vi.advanceTimersByTimeAsync(700))

    expect(requestSuggestion).toHaveBeenCalledTimes(1)
    expect(requestSuggestion.mock.calls[0][0]).toMatchObject({
      category: 'PRN',
      draftText: '잠이 오지 않는다고 다시 호소함.',
    })
  })

  it('replaces the fallback only after the latest verified model result arrives', async () => {
    const requestSuggestion = vi.fn<RequestSuggestion>().mockResolvedValue(modelSuggestion)
    render(<ChartingWorkspace requestSuggestion={requestSuggestion} />)

    fireEvent.change(screen.getByRole('textbox', { name: '간호 사실 입력' }), {
      target: { value: '잠이 오지 않는다고 다시 호소함.' },
    })
    await act(() => vi.advanceTimersByTimeAsync(700))

    expect(screen.getByText('입력 기반 AI 제안')).toBeVisible()
    expect(screen.getByLabelText('활성 통합 SOAP 제안')).toHaveTextContent(
      'S: 잠이 오지 않는다고 다시 호소함.',
    )
  })

  it('keeps the deterministic suggestion when the model route is unavailable', async () => {
    const requestSuggestion = vi.fn<RequestSuggestion>().mockRejectedValue(new Error('offline'))
    render(<ChartingWorkspace requestSuggestion={requestSuggestion} />)

    fireEvent.change(screen.getByRole('textbox', { name: '간호 사실 입력' }), {
      target: { value: '잠이 오지 않는다고 다시 호소함.' },
    })
    await act(() => vi.advanceTimersByTimeAsync(700))

    expect(screen.getByText('AI 연결 없음 · 규칙 기반 유지')).toBeVisible()
    expect(screen.getByLabelText('활성 통합 SOAP 제안')).toHaveTextContent(
      'S: “잠이 안 온다”고 호소함.',
    )
  })

  it('ignores an older response that resolves after a newer edit', async () => {
    let resolveFirst: (value: AiSuggestionResult) => void = () => undefined
    let resolveSecond: (value: AiSuggestionResult) => void = () => undefined
    const first = new Promise<AiSuggestionResult>((resolve) => { resolveFirst = resolve })
    const second = new Promise<AiSuggestionResult>((resolve) => { resolveSecond = resolve })
    const requestSuggestion = vi.fn<RequestSuggestion>()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)
    render(<ChartingWorkspace requestSuggestion={requestSuggestion} />)

    const editor = screen.getByRole('textbox', { name: '간호 사실 입력' })
    fireEvent.change(editor, { target: { value: '첫 번째 입력' } })
    await act(() => vi.advanceTimersByTimeAsync(700))
    fireEvent.change(editor, { target: { value: '두 번째 입력' } })
    await act(() => vi.advanceTimersByTimeAsync(700))

    const newest = {
      ...modelSuggestion,
      narrative: modelSuggestion.narrative.replace('다시 호소함', '두 번째로 호소함'),
    }
    await act(async () => { resolveSecond(newest) })
    await act(async () => { resolveFirst(modelSuggestion) })

    expect(screen.getByLabelText('활성 통합 SOAP 제안')).toHaveTextContent(
      '두 번째로 호소함',
    )
    expect(screen.getByLabelText('활성 통합 SOAP 제안')).not.toHaveTextContent(
      '다시 호소함',
    )
  })
})
