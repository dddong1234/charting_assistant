import type { AiSuggestionRequest, AiSuggestionResult } from '../domain/aiSuggestion'

interface SuggestionClientOptions {
  fetchImpl?: typeof fetch
  signal?: AbortSignal
  timeoutMs?: number
}

const fallbackReasons = new Set([
  'missing-key',
  'model-error',
  'invalid-model-output',
  'rate-limited',
])

export async function requestAiSuggestion(
  request: AiSuggestionRequest,
  {
    fetchImpl = fetch,
    signal,
    timeoutMs = 9_000,
  }: SuggestionClientOptions = {},
): Promise<AiSuggestionResult> {
  const controller = new AbortController()
  const abortFromCaller = () => controller.abort()

  if (signal?.aborted) {
    controller.abort()
  } else {
    signal?.addEventListener('abort', abortFromCaller, { once: true })
  }

  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl('/api/suggest', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`AI 제안 요청에 실패했습니다. (${response.status})`)
    }

    const body: unknown = await response.json()
    if (!isAiSuggestionResult(body)) {
      throw new Error('AI 제안 응답 형식이 올바르지 않습니다.')
    }

    return body
  } finally {
    window.clearTimeout(timeout)
    signal?.removeEventListener('abort', abortFromCaller)
  }
}

function isAiSuggestionResult(value: unknown): value is AiSuggestionResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>
  const validReason =
    candidate.reason === undefined ||
    (typeof candidate.reason === 'string' && fallbackReasons.has(candidate.reason))

  return (
    (candidate.source === 'model' || candidate.source === 'fallback') &&
    typeof candidate.narrative === 'string' &&
    candidate.narrative.trim().length > 0 &&
    Array.isArray(candidate.evidenceIds) &&
    candidate.evidenceIds.length > 0 &&
    candidate.evidenceIds.every((id) => typeof id === 'string' && id.trim().length > 0) &&
    validReason
  )
}
