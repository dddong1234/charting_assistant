import { describe, expect, it } from 'vitest'
import { interpretLocalNurseFacts } from './localFactInterpreter'

const evidence = [
  {
    id: 'sleep-claim',
    timestamp: '21:30',
    category: 'PRN' as const,
    label: '환자 진술',
    detail: '“잠이 안 온다”고 호소함.',
    subjective: '“잠이 안 온다”고 호소함.',
  },
  {
    id: 'vitals',
    timestamp: '21:35',
    category: 'PRN' as const,
    label: '최근 V/S',
    detail: 'BP 110/70 mmHg, HR 80회/분 확인됨.',
    subjective: '특이 호소 없음.',
  },
]

describe('local nurse fact interpreter', () => {
  it('flags a current positive sleep fact that conflicts with prior negative evidence', () => {
    const result = interpretLocalNurseFacts({
      category: 'PRN',
      draftText: '잘잠',
      evidence,
    })

    expect(result?.conflict).toEqual({
      evidenceIds: ['sleep-claim'],
      message: '현재 입력 “잘잠”이 이전 기록 “잠이 안 온다”와 다릅니다. 현재 상태와 기록 시점을 확인하세요.',
    })
  })

  it('interprets a short negative sleep phrase without an API', () => {
    const result = interpretLocalNurseFacts({
      category: 'PRN',
      draftText: '잠 못잠',
      evidence,
    })

    expect(result?.sections).toEqual({
      subjective: '잠을 자지 못했다고 호소함.',
      objective: '수면 상태에 대한 현재 입력을 확인함.',
      assessment: '수면 불편 호소 상태를 간호사가 확인함.',
      plan: '수면 및 안위 상태 변화를 이어서 관찰함.',
    })
  })

  it('preserves negation when the nurse enters that nausea is absent', () => {
    const result = interpretLocalNurseFacts({
      category: 'PRN',
      draftText: '오심 없음',
      evidence,
    })

    expect(result?.sections).toEqual({
      subjective: '오심 없다고 말함.',
      objective: '오심 여부에 대한 현재 입력을 확인함.',
      assessment: '오심 호소 없는 상태를 간호사가 확인함.',
      plan: '오심 발생 여부를 이어서 관찰함.',
    })
  })

  it('extracts a valid pain score from shorthand', () => {
    const result = interpretLocalNurseFacts({
      category: 'PRN',
      draftText: '통증 3점',
      evidence,
    })

    expect(result?.sections).toEqual({
      subjective: '통증 NRS 3점이라고 말함.',
      objective: '통증 점수 NRS 3점 확인함.',
      assessment: '현재 통증 정도를 간호사가 확인함.',
      plan: '통증 점수와 상태 변화를 이어서 관찰함.',
    })
  })

  it('normalizes a drain amount from cc to mL', () => {
    const result = interpretLocalNurseFacts({
      category: 'PRN',
      draftText: '배액 30cc',
      evidence,
    })

    expect(result?.sections).toEqual({
      subjective: '특이 호소 없음.',
      objective: '배액량 30mL 확인함.',
      assessment: '현재 배액 상태를 간호사가 확인함.',
      plan: '배액량과 양상 변화를 이어서 관찰함.',
    })
  })

  it('interprets ward ambulation shorthand as performed care', () => {
    const result = interpretLocalNurseFacts({
      category: 'PRN',
      draftText: '복도 한바퀴 걸음',
      evidence,
    })

    expect(result?.sections).toEqual({
      subjective: '보행 중 특이 호소 없음.',
      objective: '복도 보행 1회 시행함.',
      assessment: '보행 후 상태를 간호사가 확인함.',
      plan: '보행 후 불편감과 상태 변화를 이어서 관찰함.',
    })
  })

  it('preserves negation for a short dyspnea statement', () => {
    const result = interpretLocalNurseFacts({
      category: 'PRN',
      draftText: '숨찬건 없음',
      evidence,
    })

    expect(result?.sections).toEqual({
      subjective: '숨찬 증상 없다고 말함.',
      objective: '호흡 불편 여부에 대한 현재 입력을 확인함.',
      assessment: '호흡 불편 호소 없는 상태를 간호사가 확인함.',
      plan: '호흡 양상과 불편 여부를 이어서 관찰함.',
    })
  })
})
