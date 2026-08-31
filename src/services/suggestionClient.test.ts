import { describe, expect, it, vi } from 'vitest'
import type { AiSuggestionRequest } from '../domain/aiSuggestion'
import { requestAiSuggestion } from './suggestionClient'

const request: AiSuggestionRequest = {
  category: '일반',
  draftText: '복도를 한 바퀴 보행함.',
  evidence: [
    {
      id: 'walk-1',
      timestamp: '20:00',
      category: '일반',
      label: '보행',
      detail: '복도를 한 바퀴 보행함.',
      subjective: '어지럼 호소 없음.',
    },
  ],
}

const result = {
  source: 'model' as const,
  narrative:
    'S: 어지럼 호소 없음.\nO: 복도를 한 바퀴 보행함.\nA: 보행 상태를 간호사가 확인함.\nP: 보행 후 상태를 관찰함.',
  evidenceIds: ['walk-1'],
}

describe('requestAiSuggestion', () => {
  it('posts the current nurse draft and returns a typed suggestion', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json(result))

    await expect(requestAiSuggestion(request, { fetchImpl })).resolves.toEqual(result)
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/suggest',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request),
      }),
    )
  })

  it('rejects a non-success response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      Response.json({ error: 'bad request' }, { status: 400 }),
    )

    await expect(requestAiSuggestion(request, { fetchImpl })).rejects.toThrow(
      'AI 제안 요청에 실패했습니다. (400)',
    )
  })

  it('rejects a malformed success payload', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({ source: 'model' }))

    await expect(requestAiSuggestion(request, { fetchImpl })).rejects.toThrow(
      'AI 제안 응답 형식이 올바르지 않습니다.',
    )
  })

  it('cancels the request when the caller aborts', async () => {
    const controller = new AbortController()
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'))
        })
      }),
    )

    const pending = requestAiSuggestion(request, {
      fetchImpl: fetchImpl as typeof fetch,
      signal: controller.signal,
      timeoutMs: 5_000,
    })
    controller.abort()

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })
})
