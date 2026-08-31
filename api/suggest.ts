import OpenAI from 'openai'
import {
  buildFallbackSuggestion,
  parseAiSuggestionRequest,
  validateStructuredSuggestion,
  type AiSuggestionRequest,
  type AiSuggestionResult,
} from '../src/domain/aiSuggestion.js'

type FallbackReason = NonNullable<AiSuggestionResult['reason']>

interface SuggestionHandlerDependencies {
  apiKeyAvailable: boolean
  generate: (request: AiSuggestionRequest) => Promise<unknown>
  maxRequestsPerWindow?: number
  now?: () => number
}

interface RateBucket {
  count: number
  startedAt: number
}

const maxBodyCharacters = 24_000
const rateLimitWindowMs = 60_000

export function createSuggestionHandler({
  apiKeyAvailable,
  generate,
  maxRequestsPerWindow = 20,
  now = Date.now,
}: SuggestionHandlerDependencies) {
  const rateBuckets = new Map<string, RateBucket>()

  return async function handleSuggestion(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return json({ error: 'POST 요청만 허용됩니다.' }, 405, { allow: 'POST' })
    }

    const rawBody = await request.text()
    if (rawBody.length > maxBodyCharacters) {
      return json({ error: '요청 크기가 허용 범위를 초과했습니다.' }, 413)
    }

    let body: unknown
    try {
      body = JSON.parse(rawBody)
    } catch {
      return json({ error: 'JSON 요청 형식이 올바르지 않습니다.' }, 400)
    }

    const parsed = parseAiSuggestionRequest(body)
    if (!parsed.ok) {
      return json({ error: parsed.error }, 400)
    }

    const fallback = buildFallbackSuggestion(parsed.value)
    if (!fallback) {
      return json({ error: '안전하게 제안할 근거가 없습니다.' }, 422)
    }

    if (!apiKeyAvailable) {
      return json(withReason(fallback, 'missing-key'))
    }

    const clientKey = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (isRateLimited(rateBuckets, clientKey, maxRequestsPerWindow, now())) {
      return json(withReason(fallback, 'rate-limited'))
    }

    try {
      const generated = await generate(parsed.value)
      const validation = validateStructuredSuggestion(parsed.value, generated)

      if (!validation.valid) {
        return json(withReason(fallback, 'invalid-model-output'))
      }

      return json(validation.result)
    } catch {
      return json(withReason(fallback, 'model-error'))
    }
  }
}

async function generateWithOpenAi(request: AiSuggestionRequest): Promise<unknown> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const client = new OpenAI({ apiKey })
  const response = await client.responses.create(
    {
      model: process.env.OPENAI_MODEL || 'gpt-5-mini-2025-08-07',
      store: false,
      max_output_tokens: 700,
      input: [
        {
          role: 'developer',
          content: [
            {
              type: 'input_text',
              text: [
                '당신은 병동 간호사의 간호기록 작성을 돕는 초안 생성기다.',
                '제공된 간호사 입력과 근거에 존재하는 사실만 사용해 한국어 SOAP 각 항목을 작성한다.',
                '간호사 입력은 현재 시점의 사실이고 근거 기록은 과거 맥락이다. 둘이 다르면 현재 입력의 상태를 우선하며 과거의 반대 상태를 현재 상태처럼 복사하지 않는다.',
                '진단, 중증도 판단, 신규 처방, 검사/치료 권고, 약물 변경을 생성하지 않는다.',
                'assessment는 간호사가 확인한 상태만 기술한다.',
                'plan은 이미 수행된 간호 또는 입력에 명시된 관찰만 기술한다.',
                '수치와 약물명은 입력에 있는 표기를 그대로 유지한다.',
                '사용한 근거 id만 evidenceIds에 넣는다.',
              ].join(' '),
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify(request),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'soap_nursing_suggestion',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              subjective: { type: 'string' },
              objective: { type: 'string' },
              assessment: { type: 'string' },
              plan: { type: 'string' },
              evidenceIds: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['subjective', 'objective', 'assessment', 'plan', 'evidenceIds'],
          },
        },
      },
    },
    { signal: AbortSignal.timeout(8_000) },
  )

  return JSON.parse(response.output_text)
}

function isRateLimited(
  buckets: Map<string, RateBucket>,
  key: string,
  limit: number,
  timestamp: number,
): boolean {
  const current = buckets.get(key)

  if (!current || timestamp - current.startedAt >= rateLimitWindowMs) {
    buckets.set(key, { count: 1, startedAt: timestamp })
    return false
  }

  if (current.count >= limit) {
    return true
  }

  current.count += 1
  return false
}

function withReason(
  fallback: AiSuggestionResult,
  reason: FallbackReason,
): AiSuggestionResult {
  return { ...fallback, reason }
}

function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store',
      ...headers,
    },
  })
}

const defaultHandler = createSuggestionHandler({
  apiKeyAvailable: Boolean(process.env.OPENAI_API_KEY),
  generate: generateWithOpenAi,
})

export default {
  fetch: defaultHandler,
}
