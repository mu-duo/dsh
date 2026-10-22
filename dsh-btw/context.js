/**
 * Read-only context assembly for the Side question (旁问) bundle.
 *
 * The main session is the source of truth. This module copies the current
 * model-visible conversation and the assistant text that is still streaming
 * into one bounded reference block. It never appends to the session, creates a
 * child session, or sends the side conversation back into the main history.
 */
import path from 'node:path'

/** Maximum side-history turns accepted from the browser. */
export const MAX_HISTORY_MESSAGES = 40
/** Maximum total characters accepted from the browser's side history. */
export const MAX_HISTORY_CHARS = 40000
/** Maximum characters accepted for one side question. */
export const MAX_QUESTION_CHARS = 8000
/** Maximum characters kept from one main-conversation message. */
export const MAX_MESSAGE_CHARS = 24000
/** Maximum characters kept from the in-progress main assistant answer. */
export const MAX_PARTIAL_CHARS = 24000
/** How long abandoned live text remains available to a side question. */
const PARTIAL_MAX_AGE_MS = 10 * 60 * 1000
/** Maximum number of sessions whose live partial text is retained. */
const MAX_TRACKED_SESSIONS = 24

/**
 * Count characters in a string for the simple budget used by this plugin.
 * @param value - text to measure.
 * @returns UTF-16 code-unit length.
 */
function lengthOf(value) {
  return typeof value === 'string' ? value.length : 0
}

/**
 * Join the text blocks of one message.
 * @param content - message content blocks.
 * @returns trimmed visible text, excluding reasoning and tool blocks.
 */
function visibleText(content) {
  if (!Array.isArray(content)) return ''
  const parts = []
  for (const block of content) {
    if (block?.type === 'text' && typeof block.text === 'string' && block.text.trim().length > 0) {
      parts.push(block.text)
    }
  }
  return parts.join('\n').trim()
}

/**
 * List tool names one assistant message called without replaying their results.
 * @param content - message content blocks.
 * @returns distinct tool names in call order.
 */
function calledTools(content) {
  if (!Array.isArray(content)) return []
  const names = []
  for (const block of content) {
    if (block?.type === 'tool-call' && typeof block.name === 'string' && !names.includes(block.name)) {
      names.push(block.name)
    }
  }
  return names
}

/**
 * Compute a conservative character budget from the route's context window.
 *
 * The side request carries a system prompt, tool schemas, the reference
 * transcript, the side history, and the answer. A quarter of the advertised
 * window, estimated at three characters per token, leaves ample room while
 * still retaining the recent conversation. Bounds keep absurd models from
 * producing multi-megabyte prompts.
 * @param contextWindow - advertised token capacity, when known.
 * @returns character budget for the reference transcript.
 */
export function estimateContextBudget(contextWindow) {
  const tokens = Number.isFinite(contextWindow) && contextWindow > 0 ? contextWindow : 64000
  const estimate = Math.floor(tokens * 0.25 * 3)
  return Math.max(32000, Math.min(160000, estimate))
}

/**
 * Resolve the provider/model the main session is using.
 *
 * A live Agent owns the effective route; a cold or not-yet-started session may
 * only have the last request context. No silent fallback model is chosen.
 * @param options - live agent and session.
 * @returns route facts, or undefined when no route is known.
 */
export function resolveModelRoute({ agent, session }) {
  const agentOptions = agent?.options ?? {}
  const context = session?.requestContext?.()
  const provider = typeof agentOptions.provider === 'string' && agentOptions.provider.length > 0
    ? agentOptions.provider
    : context?.provider
  const model = typeof agentOptions.model === 'string' && agentOptions.model.length > 0
    ? agentOptions.model
    : context?.model
  if (typeof provider !== 'string' || provider.length === 0) return undefined
  if (typeof model !== 'string' || model.length === 0) return undefined
  return {
    provider,
    model,
    ...(Number.isFinite(context?.contextWindow) ? { contextWindow: context.contextWindow } : {}),
  }
}

/**
 * Trim one main-conversation message before it is placed in the reference block.
 * @param text - raw visible text.
 * @returns bounded text.
 */
function boundMessage(text) {
  if (text.length <= MAX_MESSAGE_CHARS) return text
  return `${text.slice(text.length - MAX_MESSAGE_CHARS)}\n…[earlier part of this message omitted]`
}

/**
 * Detect whether the final committed assistant message already contains the
 * live text, so an interrupted attempt is not repeated in the reference block.
 * @param entries - assembled main-conversation entries.
 * @param partial - current live assistant text.
 * @returns whether the live text is already represented.
 */
function partialAlreadyIncluded(entries, partial) {
  if (partial.length === 0) return true
  const last = entries[entries.length - 1]
  return last !== undefined && last.role === 'assistant' && last.raw.includes(partial)
}

/**
 * Build the bounded, read-only main-conversation reference block.
 *
 * `session.deriveMessages()` is the current model-visible history: compaction
 * has already removed superseded content, so this is the same effective
 * conversation the main agent sees, without copying the raw event log. The
 * newest messages win when the budget is exceeded.
 * @param session - live main session.
 * @param partialText - assistant text currently being generated, if any.
 * @param budgetChars - maximum characters in the reference block.
 * @returns text, included-message count, character count, truncation and streaming facts.
 */
export function buildTranscript(session, partialText, budgetChars) {
  const entries = []
  const derived = typeof session?.deriveMessages === 'function' ? session.deriveMessages() : []
  for (const message of derived) {
    if (message?.role !== 'user' && message?.role !== 'assistant') continue
    const text = visibleText(message.content)
    if (text.length === 0) continue
    const bounded = boundMessage(text)
    const tools = message.role === 'assistant' ? calledTools(message.content) : []
    const suffix = tools.length > 0 ? `\n[main agent called tools: ${tools.join(', ')}]` : ''
    entries.push({
      role: message.role,
      raw: text,
      text: `${message.role === 'user' ? 'User' : 'Assistant'}:\n${bounded}${suffix}`,
    })
  }

  const partial = typeof partialText === 'string' ? partialText.trim().slice(-MAX_PARTIAL_CHARS) : ''
  const streaming = partial.length > 0 && !partialAlreadyIncluded(entries, partial)
  if (streaming) {
    entries.push({
      role: 'assistant',
      raw: partial,
      text: `Assistant (still streaming this answer):\n${partial}`,
    })
  }

  const budget = Math.max(4000, Number.isFinite(budgetChars) ? budgetChars : 64000)
  const selected = []
  let chars = 0
  let truncated = false
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index]
    const separator = selected.length > 0 ? 2 : 0
    if (chars + entry.text.length + separator <= budget) {
      selected.unshift(entry)
      chars += entry.text.length + separator
      continue
    }
    if (selected.length === 0) {
      // Always retain the newest turn; clip it only when one message exceeds
      // the whole budget.
      const clipped = entry.text.slice(-budget)
      selected.unshift({ ...entry, text: clipped })
      chars = clipped.length
      truncated = true
      break
    }
    truncated = true
    break
  }

  if (truncated) {
    const marker = '[Earlier main-conversation messages were omitted to fit the side-question context budget.]'
    selected.unshift({ role: 'meta', raw: '', text: marker })
    chars += marker.length + (selected.length > 1 ? 2 : 0)
  }

  return {
    text: selected.map((entry) => entry.text).join('\n\n'),
    messages: selected.filter((entry) => entry.role !== 'meta').length,
    chars,
    truncated,
    streaming,
  }
}

/**
 * Validate and bound the browser-supplied side conversation.
 *
 * Only ordinary user and assistant text crosses this boundary. Unknown roles,
 * tool-shaped payloads, system messages and oversized items are dropped. The
 * newest turns survive when the total is too large.
 * @param raw - untrusted payload history.
 * @returns detached `{ role, content }` items.
 */
export function validateHistory(raw) {
  if (!Array.isArray(raw)) return []
  const accepted = []
  for (const item of raw) {
    if (item === null || typeof item !== 'object') continue
    const role = item.role
    if (role !== 'user' && role !== 'assistant') continue
    if (typeof item.content !== 'string') continue
    const content = item.content.trim()
    if (content.length === 0) continue
    accepted.push({ role, content: content.slice(0, MAX_HISTORY_CHARS) })
  }

  const selected = []
  let chars = 0
  for (let index = accepted.length - 1; index >= 0; index -= 1) {
    const item = accepted[index]
    const size = item.content.length + 16
    if (selected.length > 0 && chars + size > MAX_HISTORY_CHARS) break
    if (selected.length >= MAX_HISTORY_MESSAGES) break
    if (chars + size > MAX_HISTORY_CHARS && selected.length === 0) {
      selected.unshift({ role: item.role, content: item.content.slice(-MAX_HISTORY_CHARS) })
      break
    }
    selected.unshift(item)
    chars += size
  }
  return selected
}

/**
 * Resolve a relative or absolute display path inside the session workspace.
 * @param cwd - session working directory.
 * @param target - resolved filesystem target.
 * @param processPath - backend path projection.
 * @returns workspace-relative path, or the absolute path when outside cwd.
 */
export function displayPathFor(cwd, target, processPath) {
  const absolute = processPath(target)
  const relative = path.relative(cwd, absolute)
  if (relative === '') return '.'
  if (relative.startsWith('..') || path.isAbsolute(relative)) return absolute
  return relative.split(path.sep).join('/')
}

/**
 * Track the main agent's live assistant text per session.
 *
 * This is process-local presentation state, never a session record. Committed
 * messages are removed because `deriveMessages()` then owns the text; text from
 * an abandoned attempt is retained briefly so a cancelled answer the user saw
 * can still be discussed.
 * @returns tracker operations.
 */
export function createPartialTracker() {
  const rows = new Map()

  /**
   * Evict the oldest rows without growing with every session the Host ever saw.
   */
  function trim() {
    while (rows.size > MAX_TRACKED_SESSIONS) {
      let oldestId
      let oldestAt = Infinity
      for (const [id, row] of rows) {
        if (row.at < oldestAt) {
          oldestAt = row.at
          oldestId = id
        }
      }
      if (oldestId === undefined) break
      rows.delete(oldestId)
    }
  }

  return {
    /**
     * Fold one `agent/assistant-stream` frame.
     * @param payload - Host event payload.
     */
    record(payload) {
      const agentId = payload?.agent?.id
      const frame = payload?.frame
      if (typeof agentId !== 'string' || frame === null || typeof frame !== 'object') return
      if (frame.type === 'start') {
        rows.set(agentId, { text: '', at: Date.now() })
        trim()
        return
      }
      if (frame.type === 'chunk') {
        const chunk = frame.chunk
        if (chunk?.type !== 'text-delta' || typeof chunk.text !== 'string') return
        const row = rows.get(agentId) ?? { text: '', at: Date.now() }
        row.text = `${row.text}${chunk.text}`.slice(-MAX_PARTIAL_CHARS)
        row.at = Date.now()
        rows.set(agentId, row)
        return
      }
      if (frame.type === 'end') {
        if (frame.outcome?.kind === 'committed') {
          rows.delete(agentId)
          return
        }
        const row = rows.get(agentId)
        if (row !== undefined) row.at = Date.now()
      }
    },
    /**
     * Current live text for one session, if it is recent enough to discuss.
     * @param sessionId - main session identity.
     * @returns trimmed text or empty string.
     */
    get(sessionId) {
      const row = rows.get(sessionId)
      if (row === undefined) return ''
      if (Date.now() - row.at > PARTIAL_MAX_AGE_MS) {
        rows.delete(sessionId)
        return ''
      }
      return row.text.trim()
    },
    /** Forget one session, for diagnostics and tests. */
    forget(sessionId) {
      rows.delete(sessionId)
    },
    /** Forget every tracked session. */
    clear() {
      rows.clear()
    },
  }
}

/** Expose message-size helpers for focused tests without widening the Host API. */
export const internals = {
  boundMessage,
  visibleText,
  calledTools,
  lengthOf,
}
