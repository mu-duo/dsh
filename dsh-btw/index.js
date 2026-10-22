/**
 * Host half of the Side question (旁问) bundle.
 *
 * Serves one authenticated, streaming route that composes a temporary model
 * request from the current session's read-only context and executes a bounded
 * set of read-only workspace tools. It deliberately creates no Session or
 * Agent, writes no session event, and keeps the side conversation only in the
 * browser page's memory.
 */
import { randomUUID } from 'node:crypto'
import {
  MAX_QUESTION_CHARS,
  buildTranscript,
  createPartialTracker,
  estimateContextBudget,
  resolveModelRoute,
  validateHistory,
} from './context.js'
import { buildSystemPrompt } from './prompt.js'
import { MAX_TOOL_ROUNDS, TOOL_SCHEMAS, createToolRuntime } from './tools.js'

/** Plugin name registered with the Loader. */
export const name = 'btw'

/** Host services this plugin consumes. */
export const inject = ['connection', 'sessions', 'agents', 'llm', 'fs', 'workingDirectory']

/** Exact authenticated Fetch route used by the sidebar. */
const ROUTE_PATH = '/api/btw/chat'
/** Upper bound on one browser request body. */
const MAX_BODY_CHARS = 256 * 1024
/** Safety deadline for one side question, including tool rounds. */
const REQUEST_TIMEOUT_MS = 180000
/** Output cap for each side model call. */
const MAX_OUTPUT_TOKENS = 8192
/** Tool text retained in the model loop. */
const MAX_TOOL_TEXT_FOR_MODEL = 20000
/** Tool text sent to the compact sidebar card. */
const MAX_TOOL_TEXT_FOR_UI = 8000

/**
 * JSON response for a request that failed before streaming began.
 * @param body - JSON body.
 * @param status - HTTP status.
 * @returns response.
 */
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/**
 * One-line failure text safe to show in the sidebar.
 * @param error - thrown value.
 * @returns bounded message.
 */
function messageOf(error) {
  const message = error instanceof Error ? error.message : String(error)
  return message.length > 500 ? `${message.slice(0, 500)}…` : message
}

/**
 * Stable code for one failure.
 * @param error - thrown value.
 * @returns machine-routable code.
 */
function codeOf(error) {
  const code = error !== null && typeof error === 'object' ? error.code : undefined
  if (typeof code === 'string' && code.length > 0) return code
  if (error?.name === 'AbortError') return 'ABORTED'
  return 'BTW_FAILED'
}

/**
 * Clip one tool result for the UI.
 * @param text - full result.
 * @param max - maximum characters.
 * @returns clipped text and whether clipping happened.
 */
function clip(text, max) {
  const value = typeof text === 'string' ? text : String(text)
  return value.length > max ? { text: `${value.slice(0, max)}\n…[truncated]`, truncated: true } : { text: value, truncated: false }
}

/**
 * Parse one model tool-arguments string without executing malformed JSON.
 * @param raw - raw arguments string.
 * @returns object, or an object carrying the malformed raw text.
 */
function parseArguments(raw) {
  const source = typeof raw === 'string' ? raw.trim() : ''
  if (source.length === 0) return {}
  try {
    const value = JSON.parse(source)
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : { __invalid: true, raw: source }
  } catch {
    return { __invalid: true, raw: source }
  }
}

/**
 * One plain user message for a hand-built LLM request.
 * @param text - question text.
 * @returns request message.
 */
function userMessage(text) {
  return { role: 'user', content: [{ type: 'text', text }] }
}

/**
 * One assistant message carrying visible text and any completed tool calls.
 * @param text - visible text streamed in this model call.
 * @param calls - completed tool calls.
 * @param route - provider/model route.
 * @returns assistant message.
 */
function assistantMessage(text, calls, route) {
  const content = []
  if (text.trim().length > 0) content.push({ type: 'text', text })
  for (const call of calls) {
    content.push({ type: 'tool-call', id: call.id, name: call.name, arguments: call.arguments })
  }
  return {
    id: randomUUID(),
    role: 'assistant',
    content,
    source: { kind: 'model', provider: route.provider, model: route.model },
  }
}

/**
 * One tool result message answering a model tool call.
 * @param call - model tool call.
 * @param outcome - read-only tool result.
 * @returns tool-role message.
 */
function toolMessage(call, outcome) {
  return {
    id: randomUUID(),
    role: 'tool',
    toolCallId: call.id,
    source: { kind: 'tool', callId: call.id },
    content: [{
      type: 'text',
      text: outcome.text.length > MAX_TOOL_TEXT_FOR_MODEL
        ? `${outcome.text.slice(0, MAX_TOOL_TEXT_FOR_MODEL)}\n…[tool result truncated for this model call]`
        : outcome.text,
    }],
    ...(outcome.isError ? { isError: true } : {}),
  }
}

/**
 * Stream one side question over Server-Sent Events.
 *
 * Events are JSON objects in `data:` lines: context, delta, tool_start,
 * tool_result, done, error. The route never writes to the Session log.
 * @param options - request facts and the already assembled prompt.
 * @returns streaming HTTP response.
 */
function streamAnswer({ ctx, request, route, cwd, system, messages, transcript, sessionId }) {
  const lifetime = new AbortController()
  const signal = AbortSignal.any([request.signal, lifetime.signal])
  const encoder = new TextEncoder()
  let closed = false
  let timedOut = false
  let timer

  return new Response(new ReadableStream({
    start(controller) {
      timer = setTimeout(() => {
        timedOut = true
        lifetime.abort(new Error('side question timed out'))
      }, REQUEST_TIMEOUT_MS)

      const send = (event) => {
        if (closed) return false
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
          return true
        } catch {
          closed = true
          clearTimeout(timer)
          lifetime.abort(new Error('side question stream closed'))
          return false
        }
      }

      const finish = () => {
        if (closed) return
        closed = true
        clearTimeout(timer)
        try {
          controller.close()
        } catch {
          // The consumer may have cancelled the stream first.
        }
      }

      const fail = (error) => {
        if (closed) return
        if (request.signal.aborted) {
          finish()
          return
        }
        if (timedOut) {
          send({ type: 'error', code: 'BTW_TIMEOUT', message: 'Side question timed out before it finished.' })
          finish()
          return
        }
        send({ type: 'error', code: codeOf(error), message: messageOf(error) })
        finish()
      }

      const run = async () => {
        const runtime = createToolRuntime({ fs: ctx.fs, cwd, signal })
        send({
          type: 'context',
          sessionId,
          messages: transcript.messages,
          chars: transcript.chars,
          truncated: transcript.truncated,
          streaming: transcript.streaming,
          cwd,
          provider: route.provider,
          model: route.model,
        })

        for (let round = 1; round <= MAX_TOOL_ROUNDS; round += 1) {
          signal.throwIfAborted()
          const result = await streamOneModelCall(ctx, {
            route,
            sessionId,
            system,
            messages,
            signal,
            send,
          })
          if (result.finish?.kind === 'error') {
            throw new Error(result.finish.failure?.message ?? 'The model request failed.')
          }
          if (result.finish?.kind === 'aborted') {
            throw Object.assign(new Error('The model request was aborted.'), { name: 'AbortError' })
          }
          if (result.finish?.kind === 'max-tokens') {
            throw new Error('The answer reached the output limit before finishing.')
          }

          if (result.toolCalls.length === 0) {
            if (result.finish?.kind === 'tool-calls') {
              throw new Error('The model asked for tools but returned no callable tool.')
            }
            send({ type: 'done', usage: result.usage, rounds: round })
            return
          }

          messages.push(assistantMessage(result.text, result.toolCalls, route))
          for (const call of result.toolCalls) {
            signal.throwIfAborted()
            const args = parseArguments(call.arguments)
            send({ type: 'tool_start', id: call.id, name: call.name, args })
            const outcome = await runtime.execute(call.name, args)
            const shown = clip(outcome.text, MAX_TOOL_TEXT_FOR_UI)
            send({
              type: 'tool_result',
              id: call.id,
              name: call.name,
              ok: !outcome.isError,
              text: shown.text,
              truncated: shown.truncated,
            })
            messages.push(toolMessage(call, outcome))
          }
        }
        throw new Error(`The side question reached the ${MAX_TOOL_ROUNDS}-round tool limit.`)
      }

      run().then(finish, fail)
    },
    cancel() {
      closed = true
      clearTimeout(timer)
      lifetime.abort(new Error('side question cancelled by the browser'))
    },
  }), {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  })
}

/**
 * Run one model call, stream its text, and collect its tool calls.
 * @param ctx - plugin Context.
 * @param options - route, prompt, messages, cancellation, and event sink.
 * @returns visible text, completed tool calls, usage, and finish reason.
 */
async function streamOneModelCall(ctx, { route, sessionId, system, messages, signal, send }) {
  const partials = new Map()
  let text = ''
  let usage
  let finish

  const stream = ctx.llm.stream({
    provider: route.provider,
    model: route.model,
    sessionId,
    system,
    messages,
    tools: TOOL_SCHEMAS,
    maxTokens: MAX_OUTPUT_TOKENS,
    signal,
  })

  for await (const chunk of stream) {
    if (chunk.type === 'text-delta') {
      text += chunk.text
      if (!send({ type: 'delta', text: chunk.text })) signal.throwIfAborted()
      continue
    }
    if (chunk.type === 'block-start' && chunk.blockType === 'tool-call') {
      partials.set(chunk.index, { id: '', name: '', arguments: '' })
      continue
    }
    if (chunk.type === 'tool-call-delta') {
      const call = partials.get(chunk.index) ?? { id: '', name: '', arguments: '' }
      if (typeof chunk.id === 'string' && chunk.id.length > 0) call.id = chunk.id
      if (typeof chunk.name === 'string' && chunk.name.length > 0) call.name = chunk.name
      if (typeof chunk.argumentsDelta === 'string') call.arguments += chunk.argumentsDelta
      partials.set(chunk.index, call)
      continue
    }
    if (chunk.type === 'block-end' && chunk.block?.type === 'tool-call') {
      partials.set(chunk.index, {
        id: chunk.block.id,
        name: chunk.block.name,
        arguments: chunk.block.arguments,
      })
      continue
    }
    if (chunk.type === 'usage') {
      usage = chunk.usage
      continue
    }
    if (chunk.type === 'finish') finish = chunk.reason
  }

  const toolCalls = [...partials.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([, call]) => ({
      id: call.id.length > 0 ? call.id : randomUUID(),
      name: call.name,
      arguments: call.arguments,
    }))
    .filter((call) => call.name.length > 0)

  return { text, toolCalls, usage, finish }
}

/**
 * Validate one browser request and start the stream.
 * @param ctx - plugin Context.
 * @param tracker - live main-agent text tracker.
 * @param request - authenticated Fetch request.
 * @returns HTTP response.
 */
async function handleChat(ctx, tracker, request) {
  if (request.method !== 'POST') return json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'POST required.' } }, 405)
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_BODY_CHARS) {
    return json({ error: { code: 'BTW_BODY_TOO_LARGE', message: 'Request body is too large.' } }, 413)
  }
  let raw
  try {
    raw = await request.text()
  } catch {
    return json({ error: { code: 'BTW_BAD_BODY', message: 'Cannot read request body.' } }, 400)
  }
  if (raw.length > MAX_BODY_CHARS) {
    return json({ error: { code: 'BTW_BODY_TOO_LARGE', message: 'Request body is too large.' } }, 413)
  }
  let payload
  try {
    payload = JSON.parse(raw)
  } catch {
    return json({ error: { code: 'BTW_BAD_JSON', message: 'Request body is not JSON.' } }, 400)
  }
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return json({ error: { code: 'BTW_BAD_BODY', message: 'Request body must be an object.' } }, 400)
  }
  const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId : ''
  const question = typeof payload.question === 'string' ? payload.question.trim() : ''
  if (sessionId.length === 0) return json({ error: { code: 'BTW_NO_SESSION', message: 'sessionId is required.' } }, 400)
  if (question.length === 0) return json({ error: { code: 'BTW_NO_QUESTION', message: 'question is required.' } }, 400)
  if (question.length > MAX_QUESTION_CHARS) {
    return json({ error: { code: 'BTW_QUESTION_TOO_LARGE', message: `question exceeds ${MAX_QUESTION_CHARS} characters.` } }, 413)
  }

  const session = ctx.sessions.get(sessionId)
  if (session === undefined) {
    return json({ error: { code: 'BTW_SESSION_NOT_FOUND', message: 'That session is not live in this Host.' } }, 404)
  }
  const agent = ctx.agents.get(sessionId)
  const route = resolveModelRoute({ agent, session })
  if (route === undefined) {
    return json({
      error: {
        code: 'BTW_NO_MODEL_ROUTE',
        message: 'This session has no provider/model route yet. Send one message first, then open Side question.',
      },
    }, 409)
  }
  const cwd = ctx.workingDirectory.get(session)
  if (typeof cwd !== 'string' || cwd.length === 0) {
    return json({ error: { code: 'BTW_NO_WORKSPACE', message: 'This session has no working directory.' } }, 409)
  }

  const history = validateHistory(payload.history)
  const budget = estimateContextBudget(session.requestContext()?.contextWindow ?? route.contextWindow)
  const transcript = buildTranscript(session, tracker.get(sessionId), budget)
  const system = buildSystemPrompt({ cwd, transcript })
  const messages = history.map((item) => item.role === 'assistant'
    ? {
        id: randomUUID(),
        role: 'assistant',
        content: [{ type: 'text', text: item.content }],
        source: { kind: 'model', provider: route.provider, model: route.model },
      }
    : userMessage(item.content))
  messages.push(userMessage(question))

  return streamAnswer({ ctx, request, route, cwd, system, messages, transcript, sessionId })
}

/** Host plugin body. */
export function apply(ctx) {
  const tracker = createPartialTracker()

  ctx.effect(() => ctx.on('agent/assistant-stream', (payload) => {
    try {
      tracker.record(payload)
    } catch (error) {
      ctx.logger.warn(`btw: cannot track live assistant text: ${String(error)}`)
    }
  }), 'btw: live assistant text')

  ctx.effect(() => {
    const dispose = ctx.connection.fetch.register({
      path: ROUTE_PATH,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: (request) => handleChat(ctx, tracker, request),
    })
    return () => dispose()
  }, 'btw: chat route')
}
