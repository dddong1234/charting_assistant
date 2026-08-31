import type { NoteCategory } from './charting.js'

export interface LocalFactEvidence {
  id: string
  category: NoteCategory
  label: string
  detail: string
  subjective: string
  factText?: string
}

export interface LocalSoapSections {
  subjective: string
  objective: string
  assessment: string
  plan: string
}

export interface LocalFactInterpretation {
  sections: LocalSoapSections
  evidenceIds: string[]
  conflict?: {
    evidenceIds: string[]
    message: string
  }
}

interface LocalFactInput {
  draftText: string
  category: NoteCategory
  evidence: LocalFactEvidence[]
}

const positiveSleepPattern = /(?:잘\s*(?:잠|잤)|숙면|수면\s*(?:상태\s*)?양호)/
const negativeSleepPattern = /(?:잠(?:이|을)?[^.!?]*(?:안|못|오지\s*않)|수면[^.!?]*(?:어려|불량)|불면)/
const absentNauseaPattern = /(?:오심|메스꺼움|구역)(?:은|는|이|가)?\s*(?:없|안\s*함)/
const painScorePattern = /(?:통증|NRS)(?:은|는|이|가|\s*점수)?\s*(\d{1,2})\s*(?:점)?/i
const drainAmountPattern = /배액(?:량)?\s*(\d+(?:\.\d+)?)\s*(?:cc|mL|ml)/i
const ambulationPattern = /(?:복도[^.!?]*(?:한\s*바퀴|1\s*바퀴|보행|걸음)|보행[^.!?]*(?:시행|함|완료))/
const absentDyspneaPattern = /(?:숨\s*찬|호흡\s*곤란|호흡\s*불편)[^.!?]*(?:없|안\s*함)/

export function interpretLocalNurseFacts(
  input: LocalFactInput,
): LocalFactInterpretation | null {
  const normalizedDraft = input.draftText.replaceAll(/\s+/g, ' ').trim()
  const isShortDraft = normalizedDraft.length <= 30
  const painScore = painScorePattern.exec(normalizedDraft)?.[1]
  const drainAmount = drainAmountPattern.exec(normalizedDraft)?.[1]

  if (absentDyspneaPattern.test(normalizedDraft)) {
    return {
      sections: {
        subjective: '숨찬 증상 없다고 말함.',
        objective: '호흡 불편 여부에 대한 현재 입력을 확인함.',
        assessment: '호흡 불편 호소 없는 상태를 간호사가 확인함.',
        plan: '호흡 양상과 불편 여부를 이어서 관찰함.',
      },
      evidenceIds: evidenceIdsForCategory(input),
    }
  }

  if (ambulationPattern.test(normalizedDraft)) {
    return {
      sections: {
        subjective: '보행 중 특이 호소 없음.',
        objective: '복도 보행 1회 시행함.',
        assessment: '보행 후 상태를 간호사가 확인함.',
        plan: '보행 후 불편감과 상태 변화를 이어서 관찰함.',
      },
      evidenceIds: evidenceIdsForCategory(input),
    }
  }

  if (isShortDraft && drainAmount !== undefined) {
    return {
      sections: {
        subjective: '특이 호소 없음.',
        objective: `배액량 ${drainAmount}mL 확인함.`,
        assessment: '현재 배액 상태를 간호사가 확인함.',
        plan: '배액량과 양상 변화를 이어서 관찰함.',
      },
      evidenceIds: evidenceIdsForCategory(input),
    }
  }

  if (painScore !== undefined && Number(painScore) <= 10) {
    return {
      sections: {
        subjective: `통증 NRS ${painScore}점이라고 말함.`,
        objective: `통증 점수 NRS ${painScore}점 확인함.`,
        assessment: '현재 통증 정도를 간호사가 확인함.',
        plan: '통증 점수와 상태 변화를 이어서 관찰함.',
      },
      evidenceIds: evidenceIdsForCategory(input),
    }
  }

  if (absentNauseaPattern.test(normalizedDraft)) {
    return {
      sections: {
        subjective: '오심 없다고 말함.',
        objective: '오심 여부에 대한 현재 입력을 확인함.',
        assessment: '오심 호소 없는 상태를 간호사가 확인함.',
        plan: '오심 발생 여부를 이어서 관찰함.',
      },
      evidenceIds: evidenceIdsForCategory(input),
    }
  }

  if (isShortDraft && negativeSleepPattern.test(normalizedDraft)) {
    return {
      sections: {
        subjective: '잠을 자지 못했다고 호소함.',
        objective: '수면 상태에 대한 현재 입력을 확인함.',
        assessment: '수면 불편 호소 상태를 간호사가 확인함.',
        plan: '수면 및 안위 상태 변화를 이어서 관찰함.',
      },
      evidenceIds: evidenceIdsForCategory(input),
    }
  }

  if (!positiveSleepPattern.test(normalizedDraft)) {
    return null
  }

  const conflictingEvidenceIds = input.evidence
    .filter((item) => negativeSleepPattern.test([
      item.subjective,
      item.detail,
      item.factText ?? '',
    ].join(' ')))
    .map((item) => item.id)

  return {
    sections: {
      subjective: '잘 잤다고 말함.',
      objective: '수면 상태에 대한 현재 입력을 확인함.',
      assessment: '수면 상태를 간호사가 확인함.',
      plan: '수면 및 안위 상태 변화를 이어서 관찰함.',
    },
    evidenceIds: evidenceIdsForCategory(input),
    ...(conflictingEvidenceIds.length > 0
      ? {
          conflict: {
            evidenceIds: conflictingEvidenceIds,
            message: `현재 입력 “${normalizedDraft}”이 이전 기록 “잠이 안 온다”와 다릅니다. 현재 상태와 기록 시점을 확인하세요.`,
          },
        }
      : {}),
  }
}

export function doesNarrativeContradictLocalFacts(
  draftText: string,
  narrative: string,
): boolean {
  const draftIsPositiveSleep = positiveSleepPattern.test(draftText)
  const draftIsNegativeSleep = negativeSleepPattern.test(draftText)

  return (
    (draftIsPositiveSleep && negativeSleepPattern.test(narrative)) ||
    (draftIsNegativeSleep && positiveSleepPattern.test(narrative))
  )
}

function evidenceIdsForCategory(input: LocalFactInput): string[] {
  return input.evidence
    .filter((item) => item.category === input.category)
    .map((item) => item.id)
}
