import { describe, expect, it } from 'vitest'
import {
  buildFallbackSuggestion,
  parseAiSuggestionRequest,
  validateStructuredSuggestion,
  type AiSuggestionRequest,
} from './aiSuggestion'

const request: AiSuggestionRequest = {
  category: 'PRN',
  draftText: '잠이 안 온다고 호소함. V/S 안정적. PRN 수면제 처방 확인함.',
  evidence: [
    {
      id: 'sleep-claim',
      timestamp: '21:30',
      category: 'PRN',
      label: '환자 진술',
      detail: '“잠이 안 온다”고 호소함.',
      subjective: '“잠이 안 온다”고 호소함.',
    },
    {
      id: 'vitals',
      timestamp: '21:35',
      category: 'PRN',
      label: '최근 V/S',
      detail: 'BP 110/70 mmHg, HR 80회/분, RR 18회/분, BT 36.5℃, SpO₂ 98% 확인됨.',
      subjective: '특이 호소 없음.',
    },
    {
      id: 'medication',
      timestamp: '18:12',
      category: 'PRN',
      label: 'PRN 투약 · Dr. 박지훈 처방',
      detail: 'Stilnox 10mg PO 투약함.',
      subjective: '통증 호소 없음.',
    },
  ],
}

const groundedSections = {
  subjective: '“잠이 안 온다”고 호소함.',
  objective: 'BP 110/70 mmHg, HR 80회/분, RR 18회/분, BT 36.5℃, SpO₂ 98% 확인됨.',
  assessment: '수면 불편 호소 상태를 간호사가 확인함.',
  plan: 'Stilnox 10mg PO 투약함.',
  evidenceIds: ['sleep-claim', 'vitals', 'medication'],
}

describe('AI suggestion domain', () => {
  it('builds one deterministic SOAP narrative that stays available before model output', () => {
    expect(buildFallbackSuggestion(request)).toEqual({
      source: 'fallback',
      narrative:
        'S: “잠이 안 온다”고 호소함.\nO: BP 110/70 mmHg, HR 80회/분, RR 18회/분, BT 36.5℃, SpO₂ 98% 확인됨.\nA: 수면 불편 호소 상태를 간호사가 확인함.\nP: Dr. 박지훈 처방에 따라 Stilnox 10mg PO 투약함.',
      evidenceIds: ['sleep-claim', 'vitals', 'medication'],
    })
  })

  it('rejects a malformed request instead of forwarding it to a model', () => {
    expect(parseAiSuggestionRequest({ category: 'PRN', draftText: '', evidence: [] })).toEqual({
      ok: false,
      error: '간호 사실 입력이 필요합니다.',
    })
  })

  it('accepts grounded structured sections and formats one unified narrative', () => {
    expect(validateStructuredSuggestion(request, groundedSections)).toEqual({
      valid: true,
      result: {
        source: 'model',
        narrative:
          'S: “잠이 안 온다”고 호소함.\nO: BP 110/70 mmHg, HR 80회/분, RR 18회/분, BT 36.5℃, SpO₂ 98% 확인됨.\nA: 수면 불편 호소 상태를 간호사가 확인함.\nP: Stilnox 10mg PO 투약함.',
        evidenceIds: ['sleep-claim', 'vitals', 'medication'],
      },
    })
  })

  it('rejects an evidence id that was not supplied with the request', () => {
    const validation = validateStructuredSuggestion(request, {
      ...groundedSections,
      evidenceIds: ['sleep-claim', 'missing-evidence'],
    })

    expect(validation).toEqual({
      valid: false,
      unsupportedClaims: ['근거 ID: missing-evidence'],
    })
  })

  it('rejects hallucinated clinical numbers and medication names', () => {
    const validation = validateStructuredSuggestion(request, {
      ...groundedSections,
      plan: 'Ambien 20mg PO 투약함.',
    })

    expect(validation).toEqual({
      valid: false,
      unsupportedClaims: ['수치: 20mg', '용어: Ambien'],
    })
  })

  it('rejects diagnosis, order, or treatment recommendation language', () => {
    const validation = validateStructuredSuggestion(request, {
      ...groundedSections,
      assessment: '불면증으로 진단함.',
      plan: '추가 검사를 권고함.',
    })

    expect(validation).toEqual({
      valid: false,
      unsupportedClaims: ['허용되지 않은 임상 판단 또는 지시 표현'],
    })
  })
})
