/**
 * Durable role store for the multi-agent bundle.
 *
 * Roles live in `$DSH_HOME/multi-agent/roles.json` so the browser settings
 * page and the Host delegation tool read the same document without touching
 * the profile's Cordis patch. Writes are serialized and committed through a
 * temp file plus rename; a corrupt document is set aside instead of silently
 * discarded.
 *
 * @module @tanlinfeng/dsh-multi-agent/store
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

/** Current document version. */
export const DATA_VERSION = 1
/** Reasoning effort ids the Host accepts. */
export const EFFORTS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']
/** Smallest accepted parallel limit. */
export const MIN_PARALLEL = 1
/** Largest accepted parallel limit. */
export const MAX_PARALLEL = 8
/** Role id syntax: one lowercase word, optionally hyphenated. */
export const ROLE_ID = /^[a-z][a-z0-9-]{0,31}$/
const MAX_NAME = 60
const MAX_DESCRIPTION = 500
const MAX_INSTRUCTIONS = 4000

/** Built-in roles seeded on a profile without a role document. */
export const DEFAULT_ROLES = [
  {
    id: 'coder',
    name: 'Coder',
    description: '代码编写：实现功能、修改代码、补充测试。',
    provider: null,
    model: null,
    reasoningEffort: 'off',
    maxParallel: 2,
    readOnly: false,
    instructions: '',
    builtin: true,
  },
  {
    id: 'fixer',
    name: 'Fixer',
    description: '问题修复：定位并修复缺陷，保持最小改动。',
    provider: null,
    model: null,
    reasoningEffort: 'max',
    maxParallel: 1,
    readOnly: false,
    instructions: '',
    builtin: true,
  },
  {
    id: 'explorer',
    name: 'Explorer',
    description: '内部信息查询：在仓库内只读检索、阅读并汇报发现。',
    provider: null,
    model: null,
    reasoningEffort: 'low',
    maxParallel: 4,
    readOnly: true,
    instructions: '',
    builtin: true,
  },
  {
    id: 'librarian',
    name: 'Librarian',
    description: '外部信息查询：联网检索、抓取并核对资料。',
    provider: null,
    model: null,
    reasoningEffort: 'low',
    maxParallel: 4,
    readOnly: true,
    instructions: '',
    builtin: true,
  },
]

/** A stable failure carrying a machine-routable code. */
class RoleError extends Error {
  /**
   * @param code - stable code shown by the browser.
   * @param message - human-readable reason.
   */
  constructor(code, message) {
    super(message)
    this.name = 'RoleError'
    this.code = code
  }
}

/** Defensive copy of one role. */
function copyRole(role) {
  return { ...role }
}

/** Trim and bound an optional text field. */
function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

/** Whether a value is an accepted effort id. */
function isEffort(value) {
  return value === null || value === undefined || EFFORTS.includes(value)
}

/** Absolute path of the durable role document. */
function dataFile() {
  const root = process.env.DSH_HOME || path.join(homedir(), '.dsh')
  return path.join(root, 'multi-agent', 'roles.json')
}

/**
 * Normalize one stored role, returning undefined when it cannot be salvaged.
 * @param raw - unvalidated stored value.
 * @returns the normalized role, or undefined.
 */
function normalizeStored(raw) {
  if (raw === null || typeof raw !== 'object') return undefined
  const id = typeof raw.id === 'string' ? raw.id.trim().toLowerCase() : ''
  if (!ROLE_ID.test(id)) return undefined
  const provider = typeof raw.provider === 'string' && raw.provider.trim().length > 0 ? raw.provider.trim() : null
  const model = typeof raw.model === 'string' && raw.model.trim().length > 0 ? raw.model.trim() : null
  return {
    id,
    name: text(raw.name, MAX_NAME) || id,
    description: text(raw.description, MAX_DESCRIPTION),
    provider: provider !== null && model !== null ? provider : null,
    model: provider !== null && model !== null ? model : null,
    reasoningEffort: isEffort(raw.reasoningEffort) ? (raw.reasoningEffort ?? null) : null,
    maxParallel: Number.isInteger(raw.maxParallel)
      ? Math.min(MAX_PARALLEL, Math.max(MIN_PARALLEL, raw.maxParallel))
      : 2,
    readOnly: raw.readOnly === true,
    instructions: text(raw.instructions, MAX_INSTRUCTIONS),
    builtin: raw.builtin === true,
  }
}

/**
 * Reject one unsaved role that violates the document contract.
 * @param input - draft role from the settings page.
 * @param roles - current role list, for id uniqueness.
 * @returns normalized role fields ready to merge.
 * @throws {RoleError} when a field is unacceptable.
 */
function validate(input, roles) {
  if (input === null || typeof input !== 'object') throw new RoleError('multi-agent/invalid-role', '角色数据无效')
  const name = text(input.name, MAX_NAME)
  if (name.length === 0) throw new RoleError('multi-agent/invalid-name', '角色名称不能为空')
  const description = text(input.description, MAX_DESCRIPTION)
  const instructions = text(input.instructions, MAX_INSTRUCTIONS)
  const provider = typeof input.provider === 'string' && input.provider.trim().length > 0 ? input.provider.trim() : null
  const model = typeof input.model === 'string' && input.model.trim().length > 0 ? input.model.trim() : null
  if ((provider === null) !== (model === null)) {
    throw new RoleError('multi-agent/invalid-model', 'provider 与 model 必须同时填写或同时留空')
  }
  const reasoningEffort = input.reasoningEffort === null || input.reasoningEffort === undefined || input.reasoningEffort === ''
    ? null
    : String(input.reasoningEffort)
  if (!isEffort(reasoningEffort)) {
    throw new RoleError('multi-agent/invalid-effort', `推理等级必须是以下之一：${EFFORTS.join(', ')}`)
  }
  const maxParallel = Number(input.maxParallel)
  if (!Number.isInteger(maxParallel) || maxParallel < MIN_PARALLEL || maxParallel > MAX_PARALLEL) {
    throw new RoleError('multi-agent/invalid-parallel', `并行上限必须是 ${MIN_PARALLEL}–${MAX_PARALLEL} 的整数`)
  }
  const readOnly = input.readOnly === true
  return { name, description, instructions, provider, model, reasoningEffort, maxParallel, readOnly }
}

/**
 * Derive a fresh role id from an explicit id or the role name.
 * @param input - draft role.
 * @param roles - current role list.
 * @returns unused, syntactically valid id.
 */
function freshId(input, roles) {
  const explicit = typeof input?.id === 'string' ? input.id.trim().toLowerCase() : ''
  const base = ROLE_ID.test(explicit)
    ? explicit
    : (String(input?.name ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 26) || 'role')
  const anchored = /^[a-z]/.test(base) ? base : `r-${base}`
  if (!roles.some((role) => role.id === anchored)) return anchored
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${anchored.slice(0, 28)}-${index}`
    if (!roles.some((role) => role.id === candidate)) return candidate
  }
  throw new RoleError('multi-agent/id-exhausted', '无法生成新的角色 id')
}

/**
 * Open the role store, loading the durable document once.
 * @param ctx - owning plugin context, used for diagnostics.
 * @returns store operations; `ready` settles after the initial load.
 */
export function createRoleStore(ctx) {
  const file = dataFile()
  const data = { version: DATA_VERSION, roles: DEFAULT_ROLES.map(copyRole) }
  const listeners = new Set()
  let chain = Promise.resolve()
  let loaded = false

  const ready = (async () => {
    let source
    try {
      source = await readFile(file, 'utf8')
    } catch (error) {
      if (error?.code === 'ENOENT') {
        loaded = true
        try {
          await persist()
        } catch (writeError) {
          ctx.logger.warn(`multi-agent: cannot seed role store ${file}: ${String(writeError)}`)
        }
        return
      }
      ctx.logger.warn(`multi-agent: cannot read role store ${file}: ${String(error)}`)
      loaded = true
      return
    }
    try {
      const document = JSON.parse(source)
      const stored = Array.isArray(document?.roles) ? document.roles : []
      const roles = []
      for (const raw of stored) {
        const role = normalizeStored(raw)
        if (role !== undefined && !roles.some((existing) => existing.id === role.id)) roles.push(role)
      }
      for (const fallback of DEFAULT_ROLES) {
        if (!roles.some((role) => role.id === fallback.id)) roles.unshift(copyRole(fallback))
      }
      data.roles = roles.map((role) => ({ ...role, builtin: DEFAULT_ROLES.some((fallback) => fallback.id === role.id) }))
    } catch (error) {
      ctx.logger.warn(`multi-agent: invalid role store ${file}; keeping it aside: ${String(error)}`)
      try {
        await rename(file, `${file}.corrupt-${Date.now()}`)
      } catch (renameError) {
        ctx.logger.warn(`multi-agent: cannot set aside the invalid role store: ${String(renameError)}`)
      }
    }
    loaded = true
  })()

  /** Notify subscribers after an in-memory change. */
  function notify() {
    for (const listener of listeners) {
      try {
        listener()
      } catch (error) {
        ctx.logger.warn(`multi-agent: role listener failed: ${String(error)}`)
      }
    }
  }

  /** Persist the whole document atomically. */
  async function persist() {
    await mkdir(path.dirname(file), { recursive: true })
    const temporary = `${file}.${process.pid}.${Date.now()}.tmp`
    await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
    await rename(temporary, file)
  }

  /**
   * Apply one synchronous mutation and commit it behind every earlier write.
   * @param mutate - mutation returning the caller-visible result.
   * @returns the mutation result after persistence.
   */
  function commit(mutate) {
    const run = chain.then(async () => {
      const outcome = mutate()
      try {
        await persist()
      } catch (error) {
        ctx.logger.warn(`multi-agent: cannot write role store ${file}: ${String(error)}`)
      }
      notify()
      return outcome
    })
    chain = run.catch(() => undefined)
    return run
  }

  return {
    ready,
    /** Current roles in document order. */
    list() {
      return data.roles.map(copyRole)
    },
    /** One role by id, or undefined. */
    get(id) {
      const role = data.roles.find((candidate) => candidate.id === id)
      return role === undefined ? undefined : copyRole(role)
    },
    /**
     * Create or update one role.
     * @param input - draft role; omitting `id` creates a fresh one.
     * @returns the saved role.
     */
    async save(input) {
      await ready
      const fields = validate(input, data.roles)
      return commit(() => {
        const explicitId = typeof input?.id === 'string' ? input.id.trim().toLowerCase() : ''
        const existing = explicitId.length > 0 ? data.roles.find((role) => role.id === explicitId) : undefined
        if (existing !== undefined) {
          Object.assign(existing, fields)
          return copyRole(existing)
        }
        const role = { id: freshId(input, data.roles), ...fields, builtin: false }
        data.roles.push(role)
        return copyRole(role)
      })
    },
    /**
     * Remove one custom role.
     * @param id - role id.
     * @returns whether a role was removed.
     */
    async remove(id) {
      await ready
      const role = data.roles.find((candidate) => candidate.id === id)
      if (role === undefined) return false
      if (role.builtin) throw new RoleError('multi-agent/builtin-role', '内置角色不能删除；可使用“恢复默认”重置')
      return commit(() => {
        data.roles = data.roles.filter((candidate) => candidate.id !== id)
        return true
      })
    },
    /** Restore the four built-in roles, keeping custom ones. */
    async reset() {
      await ready
      return commit(() => {
        const custom = data.roles.filter((role) => !DEFAULT_ROLES.some((fallback) => fallback.id === role.id))
        data.roles = [...DEFAULT_ROLES.map(copyRole), ...custom]
        return data.roles.map(copyRole)
      })
    },
    /**
     * Subscribe to committed changes.
     * @param listener - invoked after each change.
     * @returns unsubscribe.
     */
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    /** Wait for every queued write. */
    async flush() {
      await chain
      if (!loaded) await ready
    },
  }
}

/** Whether an error is a role validation failure. */
export function isRoleError(error) {
  return error instanceof RoleError
}
