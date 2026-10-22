/**
 * Read-only workspace tools for the Side question channel.
 *
 * These tools deliberately do not reuse the main agent's tool registry: the
 * side question must never append tool events to the main session, never ask
 * for approval, and never gain write, shell, or network capabilities. Every
 * path is confined to the session's current working directory.
 */
import path from 'node:path'
import { displayPathFor } from './context.js'

/** Maximum number of model/tool rounds in one side question. */
export const MAX_TOOL_ROUNDS = 6
/** Maximum entries listed during one recursive search. */
const MAX_WALK_ENTRIES = 5000
/** Maximum files considered by one grep. */
const MAX_SEARCH_FILES = 2500
/** Maximum directory depth during one recursive search. */
const MAX_WALK_DEPTH = 12
/** Maximum files returned by glob. */
const MAX_GLOB_RESULTS = 200
/** Maximum matches returned by grep. */
const MAX_GREP_RESULTS = 50
/** Maximum lines returned by read in one call. */
const MAX_READ_LINES = 400
/** Maximum bytes in one read result. */
const MAX_READ_BYTES = 50000
/** Maximum source file size accepted by read. */
const MAX_READ_FILE_BYTES = 2 * 1024 * 1024
/** Maximum source file size considered by grep. */
const MAX_SEARCH_FILE_BYTES = 1024 * 1024
/** Maximum characters in one tool result handed back to the model. */
const MAX_TOOL_RESULT_CHARS = 20000
/** Directory names skipped while walking, to keep code discovery useful. */
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'out', '.next', 'coverage', '.cache', '.turbo', '.venv', 'target'])

/** Tool schemas sent with every side-question model call. */
export const TOOL_SCHEMAS = [
  {
    name: 'read',
    description: 'Read a UTF-8 text file inside the session workspace. Returns line-numbered content and a continuation hint. Read-only; paths outside the workspace are refused.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        file_path: { type: 'string', description: 'File path, relative to the session working directory or absolute inside it.' },
        offset: { type: 'integer', description: '1-based first line to return. Defaults to 1.' },
        limit: { type: 'integer', description: `Maximum lines to return, at most ${MAX_READ_LINES}. Defaults to 160.` },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'glob',
    description: 'Find files in the session workspace by a glob pattern. Supports *, ** and ?. Skips .git, node_modules, build output and similar heavy directories. Read-only.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        pattern: { type: 'string', description: 'Glob such as **/*.ts or src/**/README.md. Patterns without a slash also match file basenames.' },
        path: { type: 'string', description: 'Optional directory or file to search under. Defaults to the workspace root.' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'grep',
    description: 'Search UTF-8 files in the session workspace with a JavaScript regular expression. Returns path:line: text. Read-only; skips binary, oversized and heavy directories.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        pattern: { type: 'string', description: 'JavaScript regular expression source. Escape regex metacharacters for literal text.' },
        path: { type: 'string', description: 'Optional directory or file to search under. Defaults to the workspace root.' },
        glob: { type: 'string', description: 'Optional glob filter, for example **/*.ts.' },
        ignore_case: { type: 'boolean', description: 'Match case-insensitively when true.' },
      },
      required: ['pattern'],
    },
  },
]

/**
 * Escape regular-expression metacharacters.
 * @param value - one character.
 * @returns escaped character.
 */
function escapeRegExp(value) {
  return /[\\^$.*+?()[\]{}|]/.test(value) ? `\\${value}` : value
}

/**
 * Compile the small glob dialect used by the side tools.
 * @param pattern - glob with `/` separators.
 * @returns anchored regular expression.
 */
export function globToRegExp(pattern) {
  const normalized = String(pattern).replaceAll('\\', '/').replace(/^\.\//, '').replace(/^\/+/, '')
  const trailing = normalized.endsWith('/') ? `${normalized}**` : normalized
  let source = '^'
  for (let index = 0; index < trailing.length; index += 1) {
    const char = trailing[index]
    if (char === '*') {
      if (trailing[index + 1] === '*') {
        index += 1
        if (trailing[index + 1] === '/') {
          index += 1
          source += '(?:.*/)?'
        } else {
          source += '.*'
        }
      } else {
        source += '[^/]*'
      }
      continue
    }
    if (char === '?') {
      source += '[^/]'
      continue
    }
    source += escapeRegExp(char)
  }
  return new RegExp(`${source}$`)
}

/**
 * Test one workspace-relative path against a glob.
 * @param pattern - normalized glob pattern.
 * @param relative - workspace-relative path with `/` separators.
 * @param regex - compiled pattern.
 * @returns whether the path matches.
 */
function matchesGlob(pattern, relative, regex) {
  if (regex.test(relative)) return true
  if (!pattern.includes('/')) return regex.test(path.posix.basename(relative))
  return false
}

/**
 * Normalize a user-supplied glob for matching and display.
 * @param value - raw pattern.
 * @returns pattern without a leading `./` or `/`.
 */
function normalizeGlob(value) {
  return String(value).replaceAll('\\', '/').replace(/^\.\//, '').replace(/^\/+/, '')
}

/**
 * Format one line for the line-numbered read result.
 * @param number - 1-based line number.
 * @param text - line content.
 * @param width - padding width.
 * @returns formatted line.
 */
function readLine(number, text, width) {
  const clipped = text.length > 2000 ? `${text.slice(0, 2000)}…` : text
  return `${String(number).padStart(width, ' ')}  ${clipped}`
}

/**
 * Build a bounded, line-numbered read window.
 * @param text - complete file text.
 * @param display - workspace-relative display path.
 * @param offset - 1-based first line.
 * @param limit - maximum requested lines.
 * @returns formatted result.
 */
export function formatReadWindow(text, display, offset, limit) {
  const normalized = String(text).replaceAll('\r\n', '\n').replaceAll('\r', '\n')
  if (normalized.length === 0) return `${display} (empty file)`
  const lines = normalized.split('\n')
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()
  const total = lines.length
  if (total === 0) return `${display} (empty file)`

  const startLine = Number.isInteger(offset) && offset > 0 ? offset : 1
  const requested = Number.isInteger(limit) && limit > 0 ? Math.min(limit, MAX_READ_LINES) : 160
  if (startLine > total) return `${display} has ${total} lines; offset ${startLine} is past the end.`

  const width = String(total).length
  const startIndex = startLine - 1
  const output = []
  let bytes = 0
  let endIndex = startIndex
  let byteLimited = false
  for (let index = startIndex; index < total && output.length < requested; index += 1) {
    const line = readLine(index + 1, lines[index], width)
    const lineBytes = Buffer.byteLength(line, 'utf8')
    if (bytes + lineBytes > MAX_READ_BYTES) {
      byteLimited = true
      break
    }
    output.push(line)
    bytes += lineBytes + 1
    endIndex = index + 1
  }

  if (output.length === 0) return `${display} (line ${startLine} is too large to return)`
  const header = `${display} (lines ${startLine}-${endIndex} of ${total})`
  const footer = []
  if (endIndex < total) {
    if (byteLimited) footer.push('…[read window stopped at the byte limit]')
    footer.push(`…${total - endIndex} more line${total - endIndex === 1 ? '' : 's'}; call read with offset ${endIndex + 1} to continue.`)
  }
  return [header, ...output, ...footer].join('\n')
}

/**
 * Read one optional numeric field.
 * @param value - untrusted input.
 * @param fallback - value used when absent.
 * @returns integer or fallback.
 */
function integerOr(value, fallback) {
  return Number.isInteger(value) ? value : fallback
}

/**
 * Convert an unknown thrown value into a one-line message.
 * @param error - thrown value.
 * @returns short message.
 */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Create one request-scoped read-only tool runtime.
 * @param options - filesystem service, session cwd, and cancellation.
 * @returns executor and internal helpers.
 */
export function createToolRuntime({ fs, cwd, signal }) {
  let rootPromise
  let rootTarget
  let rootDisplay

  /** Resolve the workspace root once per request. */
  function root() {
    if (rootPromise === undefined) {
      rootPromise = fs.resolve(cwd, { signal }).then((target) => {
        rootTarget = target
        rootDisplay = fs.processPath(target)
        return target
      })
    }
    return rootPromise
  }

  /**
   * Resolve a path and prove it remains inside the session workspace.
   * @param raw - user path.
   * @returns resolved target.
   */
  async function targetFor(raw) {
    if (typeof raw !== 'string' || raw.trim().length === 0) throw new Error('path must be a non-empty string')
    const base = await root()
    const target = await fs.resolve(raw.trim(), { cwd, signal })
    if (!fs.contains(base, target)) throw new Error(`path is outside the session workspace: ${raw.trim()}`)
    return target
  }

  /**
   * Describe a target relative to the workspace.
   * @param target - resolved target.
   * @returns display path.
   */
  function displayOf(target) {
    return displayPathFor(rootDisplay ?? cwd, target, (value) => fs.processPath(value))
  }

  /**
   * Walk a directory tree with bounded entries, depth, and path containment.
   * @param start - directory target.
   * @param startRelative - display path prefix.
   * @param depth - current depth.
   * @param state - shared walk counters.
   * @param visit - file callback.
   */
  async function walk(start, startRelative, depth, state, visit) {
    if (state.done || state.entries >= MAX_WALK_ENTRIES) {
      if (state.entries >= MAX_WALK_ENTRIES) state.truncated = true
      return
    }
    let entries
    try {
      entries = await fs.listDir(start, signal)
    } catch (error) {
      state.errors += 1
      return
    }
    state.entries += entries.length
    const ordered = [...entries].sort((left, right) => {
      if (left.type === 'directory' && right.type !== 'directory') return -1
      if (right.type === 'directory' && left.type !== 'directory') return 1
      return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    })
    for (const entry of ordered) {
      if (state.done) return
      if (state.entries > MAX_WALK_ENTRIES) {
        state.truncated = true
        return
      }
      if (rootTarget !== undefined && !fs.contains(rootTarget, entry.target)) {
        state.outside += 1
        continue
      }
      const relative = startRelative.length > 0 ? `${startRelative}/${entry.name}` : entry.name
      if (entry.type === 'directory') {
        if (depth >= MAX_WALK_DEPTH) {
          state.truncated = true
          continue
        }
        if (SKIP_DIRS.has(entry.name)) continue
        await walk(entry.target, relative, depth + 1, state, visit)
        continue
      }
      if (entry.type === 'file') await visit(entry, relative)
    }
  }

  /** Read one file. */
  async function readTool(args) {
    const target = await targetFor(args.file_path)
    const info = await fs.stat(target, signal)
    if (info === undefined) throw new Error(`not found: ${args.file_path}`)
    if (info.type === 'directory') throw new Error(`is a directory: ${args.file_path}`)
    if (info.type !== 'file') throw new Error(`not a regular file: ${args.file_path}`)
    if (typeof info.size === 'number' && info.size > MAX_READ_FILE_BYTES) {
      throw new Error(`file is too large to read (${info.size} bytes, limit ${MAX_READ_FILE_BYTES})`)
    }
    const text = await fs.readText(target, signal)
    return {
      text: formatReadWindow(text, displayOf(target), integerOr(args.offset, 1), integerOr(args.limit, 160)),
    }
  }

  /** Find files by glob. */
  async function globTool(args) {
    if (typeof args.pattern !== 'string' || args.pattern.trim().length === 0) throw new Error('pattern must be a non-empty string')
    const pattern = normalizeGlob(args.pattern)
    const regex = globToRegExp(pattern)
    const base = await targetFor(typeof args.path === 'string' && args.path.trim().length > 0 ? args.path : '.')
    const baseInfo = await fs.stat(base, signal)
    if (baseInfo === undefined) throw new Error(`path not found: ${args.path ?? '.'}`)
    const matches = []
    if (baseInfo.type === 'file') {
      const relative = displayOf(base)
      if (matchesGlob(pattern, relative, regex)) matches.push(relative)
    } else if (baseInfo.type === 'directory') {
      const state = { entries: 0, outside: 0, errors: 0, truncated: false, done: false }
      await walk(base, displayOf(base) === '.' ? '' : displayOf(base), 0, state, async (entry, relative) => {
        if (matchesGlob(pattern, relative, regex)) {
          matches.push(relative)
          if (matches.length >= MAX_GLOB_RESULTS) {
            state.truncated = true
            state.done = true
          }
        }
      })
    } else {
      throw new Error(`not a regular file or directory: ${args.path ?? '.'}`)
    }
    if (matches.length === 0) return { text: `No files matched ${pattern}.` }
    matches.sort((left, right) => left.localeCompare(right))
    const lines = [`${matches.length} file${matches.length === 1 ? '' : 's'} matched ${pattern}:`, ...matches]
    if (matches.length >= MAX_GLOB_RESULTS) lines.push(`…[stopped at ${MAX_GLOB_RESULTS} paths]`)
    return { text: lines.join('\n') }
  }

  /** Search file text with a regular expression. */
  async function grepTool(args) {
    if (typeof args.pattern !== 'string' || args.pattern.length === 0) throw new Error('pattern must be a non-empty string')
    let matcher
    try {
      matcher = new RegExp(args.pattern, args.ignore_case === true ? 'i' : '')
    } catch (error) {
      throw new Error(`invalid regular expression: ${messageOf(error)}`)
    }
    const globPattern = typeof args.glob === 'string' && args.glob.trim().length > 0 ? normalizeGlob(args.glob) : undefined
    const globRegex = globPattern === undefined ? undefined : globToRegExp(globPattern)
    const base = await targetFor(typeof args.path === 'string' && args.path.trim().length > 0 ? args.path : '.')
    const baseInfo = await fs.stat(base, signal)
    if (baseInfo === undefined) throw new Error(`path not found: ${args.path ?? '.'}`)
    const hits = []
    const state = { entries: 0, files: 0, outside: 0, errors: 0, truncated: false, done: false }

    const inspectFile = async (entry, relative) => {
      if (state.files >= MAX_SEARCH_FILES) {
        state.truncated = true
        state.done = true
        return
      }
      if (globPattern !== undefined && !matchesGlob(globPattern, relative, globRegex)) return
      if (typeof entry.size === 'number' && entry.size > MAX_SEARCH_FILE_BYTES) {
        state.truncated = true
        return
      }
      state.files += 1
      let text
      try {
        text = await fs.readText(entry.target, signal)
      } catch (error) {
        state.errors += 1
        return
      }
      if (text.includes('\0')) return
      const lines = text.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n')
      for (let index = 0; index < lines.length; index += 1) {
        if (!matcher.test(lines[index])) continue
        const clipped = lines[index].trim().slice(0, 300)
        hits.push(`${relative}:${index + 1}: ${clipped.length > 0 ? clipped : '(blank line)'}`)
        if (hits.length >= MAX_GREP_RESULTS) {
          state.truncated = true
          state.done = true
          return
        }
      }
    }

    if (baseInfo.type === 'file') {
      await inspectFile({ target: base, size: baseInfo.size }, displayOf(base))
    } else if (baseInfo.type === 'directory') {
      await walk(base, displayOf(base) === '.' ? '' : displayOf(base), 0, state, inspectFile)
    } else {
      throw new Error(`not a regular file or directory: ${args.path ?? '.'}`)
    }

    if (hits.length === 0) return { text: `No matches for /${args.pattern}/.` }
    const lines = [`${hits.length} match${hits.length === 1 ? '' : 'es'} for /${args.pattern}/:`, ...hits]
    if (hits.length >= MAX_GREP_RESULTS) lines.push(`…[stopped at ${MAX_GREP_RESULTS} matches]`)
    else if (state.truncated) lines.push('…[search stopped before the whole workspace was scanned]')
    return { text: lines.join('\n') }
  }

  return {
    /**
     * Execute one tool call and normalize every failure into a tool result.
     * @param name - model-requested tool name.
     * @param args - parsed arguments, or a raw marker object.
     * @returns result text and error flag.
     */
    async execute(name, args) {
      if (signal?.aborted) return { text: 'Error: cancelled', isError: true }
      const input = args !== null && typeof args === 'object' && !Array.isArray(args) ? args : {}
      try {
        let outcome
        if (name === 'read') outcome = await readTool(input)
        else if (name === 'glob') outcome = await globTool(input)
        else if (name === 'grep') outcome = await grepTool(input)
        else return { text: `Error: unknown read-only tool ${String(name)}`, isError: true }
        const text = outcome.text.length > MAX_TOOL_RESULT_CHARS
          ? `${outcome.text.slice(0, MAX_TOOL_RESULT_CHARS)}\n…[tool result truncated]`
          : outcome.text
        return { text, isError: false }
      } catch (error) {
        return { text: `Error: ${messageOf(error).slice(0, 2000)}`, isError: true }
      }
    },
  }
}
