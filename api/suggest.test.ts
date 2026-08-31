// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { AiSuggestionRequest } from '../src/domain/aiSuggestion'
import { createSuggestionHandler } from './suggest'

const requestBody: AiSuggestionRequest = {
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

const groundedModelOutput = {
  subjective: '“잠이 안 온다”고 호소함.',
  objective: 'BP 110/70 mmHg, HR 80회/분, RR 18회/분, BT 36.5℃, SpO₂ 98% 확인됨.',
  assessment: '수면 불편 호소 상태를 간호사가 확인함.',
  plan: 'Stilnox 10mg PO 투약함.',
  evidenceIds: ['sleep-claim', 'vitals', 'medication'],
}

function post(body: unknown, ip = '203.0.113.10') {
  return new Request('https://example.test/api/suggest', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/suggest', () => {
  it('returns a verified model suggestion from the injected generator', async () => {
    const generate = vi.fn().mockResolvedValue(groundedModelOutput)
    const handler = createSuggestionHandler({ apiKeyAvailable: true, generate })

    const response = await handler(post(requestBody))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      source: 'model',
      narrative:
        'S: “잠이 안 온다”고 호소함.\nO: BP 110/70 mmHg, HR 80회/분, RR 18회/분, BT 36.5℃, SpO₂ 98% 확인됨.\nA: 수면 불편 호소 상태를 간호사가 확인함.\nP: Stilnox 10mg PO 투약함.',
      evidenceIds: ['sleep-claim', 'vitals', 'medication'],
    })
    expect(generate).toHaveBeenCalledWith(requestBody)
  })

  it('rejects malformed input without calling the generator', async () => {
    const generate = vi.fn()
    const handler = createSuggestionHandler({ apiKeyAvailable: true, generate })

    const response = await handler(post({ category: 'PRN', draftText: '', evidence: [] }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: '간호 사실 입력이 필요합니다.' })
    expect(generate).not.toHaveBeenCalled()
  })

  it('returns an explicit deterministic fallback when the API key is missing', async () => {
    const handler = createSuggestionHandler({ apiKeyAvailable: false, generate: vi.fn() })

    const response = await handler(post(requestBody))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      source: 'fallback',
      reason: 'missing-key',
      evidenceIds: ['sleep-claim', 'vitals', 'medication'],
    })
  })

  it('keeps the fallback when the model call fails', async () => {
    const handler = createSuggestionHandler({
      apiKeyAvailable: true,
      generate: vi.fn().mockRejectedValue(new Error('upstream unavailable')),
    })

    const response = await handler(post(requestBody))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ source: 'fallback', reason: 'model-error' })
  })

  it('keeps the fallback when model output fails grounding validation', async () => {
    const handler = createSuggestionHandler({
      apiKeyAvailable: true,
      generate: vi.fn().mockResolvedValue({ ...groundedModelOutput, plan: 'Ambien 20mg PO 투약함.' }),
    })

    const response = await handler(post(requestBody))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      source: 'fallback',
      reason: 'invalid-model-output',
    })
  })

  it('rate limits repeated calls from one client without removing the fallback', async () => {
    const generate = vi.fn().mockResolvedValue(groundedModelOutput)
    const handler = createSuggestionHandler({
      apiKeyAvailable: true,
      generate,
      maxRequestsPerWindow: 1,
      now: () => 1_000,
    })

    await handler(post(requestBody, '198.51.100.7'))
    const response = await handler(post(requestBody, '198.51.100.7'))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ source: 'fallback', reason: 'rate-limited' })
    expect(generate).toHaveBeenCalledTimes(1)
  })
})
