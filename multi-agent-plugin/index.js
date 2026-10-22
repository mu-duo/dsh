/**
 * Host half of the multi-agent bundle.
 *
 * Adds role definitions on top of the built-in subagent service: one
 * `delegate` tool whose `role` enum comes from the durable role store, a
 * per-parent/per-role parallelism gate, a prompt section that teaches the main
 * agent how to orchestrate, and the authenticated route the browser roster and
 * the bundle-page role editor share.
 *
 * @module @tanlinfeng/dsh-multi-agent
 */
import { createRoleStore, EFFORTS, MAX_PARALLEL, MIN_PARALLEL, isRoleError } from './store.js'

/** Plugin name registered with the Loader. */
export const name = 'multi-agent'

/** Host services this plugin consumes. */
export const inject = ['tools', 'systemPrompt', 'subagents', 'agents', 'connection']

/** Model-facing delegation tool name. */
const TOOL_NAME = 'delegate'
/** Exact authenticated Fetch route used by both browser halves. */
const ROUTE_PATH = '/api/multi-agent'
/** Prompt section order, next to the built-in delegation guidance. */
const PROMPT_ORDER = 2660
/** Longest task accepted in one delegation. */
const MAX_TASK = 32000
/** Finished runs retained for the roster. */
const MAX_FINISHED_RUNS = 50

/** Stable failure raised by a route endpoint. */
class ProbeError extends Error {
  /**
   * @param code - stable failure code.
   * @param message - human-readable reason.
   */
  constructor(code, message) {
    super(message)
    this.name = 'ProbeError'
    this.code = code
  }
}

/** One text block array for tool presentation. */
function line(value) {
  return [{ type: 'text', text: value }]
}

/** First non-empty line of a task, bounded for a catalog label. */
function firstLine(value) {
  const lineText = String(value ?? '').trim().split(/\r?\n/, 1)[0] ?? ''
  return lineText.length > 64 ? `${lineText.slice(0, 64)}…` : lineText
}

/** Compact model description for prompts and the roster. */
function modelLabel(role) {
  if (role.provider !== null && role.model !== null) return `${role.provider}/${role.model}`
  return 'inherits the parent route'
}

/** One role bullet for the tool description and prompt section. */
function roleBullet(role) {
  const parts = [`\`${role.id}\` — **${role.name}**`]
  if (role.description.length > 0) parts.push(role.description)
  parts.push(`model: ${modelLabel(role)}`)
  parts.push(`reasoning: ${role.reasoningEffort ?? 'model default'}`)
  parts.push(`parallel: ${role.maxParallel} per parent session`)
  if (role.readOnly) parts.push('read-only')
  return `- ${parts.join('; ')}`
}

/**
 * Model-facing tool description over the current role list.
 * @param roles - current roles.
 * @returns tool description.
 */
function toolDescription(roles) {
  const head = [
    'Delegate one self-contained task to a configured subagent role.',
    'The child starts a fresh session: it sees only your `task` plus its role instructions, not this conversation.',
    'This call returns immediately; the child’s final answer arrives later as a subagent completion notice.',
    'Independent tasks may be delegated in parallel, up to each role’s per-parent limit.',
    'Prefer explorer/librarian for read-only investigation, coder for implementation, and fixer for repairs.',
  ].join(' ')
  if (roles.length === 0) {
    return `${head}\n\nNo roles are configured. Open Plugins → Multi-agent to add one.`
  }
  return `${head}\n\nRoles:\n${roles.map(roleBullet).join('\n')}`
}

/**
 * System-prompt section teaching the orchestration rules over the current roles.
 * @param roles - current roles.
 * @returns prompt section text.
 */
function promptSection(roles) {
  const rules = [
    'Use the `delegate` tool to run a self-contained task in a role-specific subagent. The main agent owns the orchestration: decompose the work, choose the role, and merge the results.',
    '- Give every task all the context it needs: the child does not see this conversation, so restate file paths, constraints, and the expected output.',
    '- Run independent tasks in parallel, one `delegate` call per task; respect each role’s limit per parent session. A rejected over-limit call lists the child ids currently occupying that role.',
    '- Prefer read-only roles (explorer, librarian) for investigation and keep implementation with coder; use fixer for targeted repairs.',
    '- A started child reports back through a completion notice. Use `send_message` to continue a live child, and `interrupt_agent` to stop one whose direction is wrong.',
    '- Do not delegate work you can finish in one step, and never delegate the same question twice in parallel.',
  ]
  if (roles.length === 0) {
    return ['## Multi-agent delegation', '', ...rules, '', 'No subagent roles are configured yet; add one in Plugins → Multi-agent.'].join('\n')
  }
  return [
    '## Multi-agent delegation',
    '',
    ...rules,
    '',
    'Configured roles:',
    ...roles.map(roleBullet),
  ].join('\n')
}

/**
 * Open the role store and install the delegation surface, run registry, and
 * browser route.
 * @param ctx - owning plugin context.
 */
export function apply(ctx) {
  const store = createRoleStore(ctx)
  const llm = ctx.get('llm')

  /** childId -> run record. */
  const runs = new Map()
  /** `${parentSessionId}\u0000${roleId}` -> reserved + running count. */
  const inFlight = new Map()

  const gateKey = (parentId, roleId) => `${parentId}\u0000${roleId}`
  const gateUsed = (parentId, roleId) => inFlight.get(gateKey(parentId, roleId)) ?? 0

  /**
   * Reserve one role slot before an asynchronous start.
   * @returns false when the role is already at its limit.
   */
  function acquire(parentId, roleId, limit) {
    const key = gateKey(parentId, roleId)
    const used = inFlight.get(key) ?? 0
    if (used >= limit) return false
    inFlight.set(key, used + 1)
    return true
  }

  /** Release one reserved or running role slot. */
  function release(parentId, roleId) {
    const key = gateKey(parentId, roleId)
    const used = inFlight.get(key) ?? 0
    if (used <= 1) inFlight.delete(key)
    else inFlight.set(key, used - 1)
  }

  /** Drop the oldest finished records above the retention cap. */
  function trimRuns() {
    const finished = [...runs.values()]
      .filter((record) => record.status !== 'running')
      .sort((left, right) => (left.settledAt ?? 0) - (right.settledAt ?? 0))
    for (const record of finished.slice(0, Math.max(0, finished.length - MAX_FINISHED_RUNS))) {
      runs.delete(record.childId)
    }
  }

  /**
   * Warn before the child is created when the configured effort cannot work on
   * the effective route. A route the live adapter cannot describe is left to
   * the subagent service so a missing adapter keeps its own failure reason.
   */
  async function assertEffort(role, parent, signal) {
    if (role.reasoningEffort === null) return
    let route
    if (role.provider !== null && role.model !== null) {
      route = { provider: role.provider, model: role.model }
    } else {
      const config = parent.session?.requestHeader?.()?.config
      route = {
        provider: config?.provider ?? parent.options?.provider,
        model: config?.model ?? parent.options?.model,
      }
    }
    if (typeof route.provider !== 'string' || typeof route.model !== 'string' || llm === undefined) return
    let info
    try {
      info = await llm.resolveModelInfo(route.provider, route.model, signal)
    } catch {
      return
    }
    const efforts = info?.reasoning?.efforts
    if (Array.isArray(efforts) && efforts.length > 0) {
      if (!efforts.some((effort) => effort.id === role.reasoningEffort)) {
        throw new ProbeError(
          'multi-agent/unsupported-effort',
          `角色 ${role.id} 的推理等级 "${role.reasoningEffort}" 不受 ${route.provider}/${route.model} 支持；可选：${efforts.map((effort) => effort.id).join(', ')}。请在 Plugins → Multi-agent 中调整该角色。`,
        )
      }
      return
    }
    if (info?.reasoning === undefined) {
      throw new ProbeError(
        'multi-agent/unsupported-effort',
        `模型 ${route.provider}/${route.model} 不支持推理等级，但角色 ${role.id} 配置了 "${role.reasoningEffort}"。请在 Plugins → Multi-agent 中清除该等级或更换模型。`,
      )
    }
  }

  /** Build the `delegate` tool over the current role list. */
  function toolDefinition() {
    const roles = store.list()
    return {
      name: TOOL_NAME,
      description: toolDescription(roles),
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          role: {
            type: 'string',
            enum: roles.map((role) => role.id),
            description: 'Role id to run the task as. The role decides model, reasoning effort, and parallelism.',
          },
          task: {
            type: 'string',
            description: 'Self-contained instructions for the child. It does not see this conversation.',
          },
          cwd: {
            type: 'string',
            description: 'Optional initial working directory for the child; relative paths resolve against this session’s directory.',
          },
        },
        required: ['role', 'task'],
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            kind: { type: 'string', const: 'activation' },
            subagentId: { type: 'string' },
            role: { type: 'string' },
          },
          required: ['kind', 'subagentId', 'role'],
        },
        render: (_args, value) => line(`started ${value.role} subagent ${value.subagentId}`),
      },
      isConcurrencySafe: () => true,
      async execute(args, exec) {
        const parent = exec.agent
        if (parent === undefined) throw new Error('delegate requires a calling agent (exec.agent was undefined)')
        const parentId = parent.session?.header?.id
        if (typeof parentId !== 'string') throw new Error('delegate requires a session-backed calling agent')
        const role = store.get(String(args?.role ?? ''))
        if (role === undefined) throw new Error(`unknown role "${String(args?.role ?? '')}"; use one of the ids from the tool description`)
        const task = typeof args?.task === 'string' ? args.task.trim() : ''
        if (task.length === 0) throw new Error('task must be a non-empty self-contained instruction')
        if (task.length > MAX_TASK) throw new Error(`task exceeds ${MAX_TASK} characters; split it into smaller delegations`)

        const maxDepth = ctx.subagents.resolveMaxDepth()
        const depth = parent.session?.header?.delegationDepth ?? 0
        if (maxDepth !== undefined && depth >= maxDepth) {
          throw new Error(`delegation depth is ${depth} and the maximum is ${maxDepth}; carry out this work directly`)
        }

        if (!acquire(parentId, role.id, role.maxParallel)) {
          const active = [...runs.values()]
            .filter((record) => record.status === 'running' && record.parentSessionId === parentId && record.roleId === role.id)
            .map((record) => record.childId)
          throw new Error(
            `role ${role.id} already has ${role.maxParallel} running subagent(s) under this session${active.length > 0 ? `: ${active.join(', ')}` : ''}. Wait for one to finish or use another role.`,
          )
        }

        try {
          await assertEffort(role, parent, exec.signal)
          exec.signal.throwIfAborted()
          const agentOptions = {
            ...role.provider !== null && role.model !== null ? { provider: role.provider, model: role.model } : {},
            ...role.reasoningEffort !== null ? { reasoningEffort: role.reasoningEffort } : {},
          }
          const preamble = [
            `You are the \`${role.name}\` subagent.${role.description.length > 0 ? ` ${role.description}` : ''}`,
            ...role.readOnly
              ? ['Read-only role: do not create, edit, or delete files, and do not run commands that change workspace state. Inspect and report.']
              : [],
            ...role.instructions.length > 0 ? ['', role.instructions] : [],
            '',
            'Task:',
            task,
          ].join('\n')
          const label = `${role.name} · ${firstLine(task)}`.slice(0, 120)
          const activation = await ctx.subagents.startActivation({
            provider: 'spawn',
            label,
            request: {
              prompt: [{ type: 'text', text: preamble }],
              parent,
              ...Object.keys(agentOptions).length > 0 ? { agentOptions } : {},
              ...maxDepth !== undefined ? { maxDepth } : {},
              ...typeof args?.cwd === 'string' && args.cwd.length > 0 ? { cwd: args.cwd } : {},
            },
            signal: exec.signal,
            delivery: 'parent',
          })
          const record = {
            childId: activation.childId,
            parentSessionId: parentId,
            roleId: role.id,
            roleName: role.name,
            label,
            startedAt: Date.now(),
            settledAt: null,
            status: 'running',
            stopReason: null,
            error: null,
            provider: role.provider,
            model: role.model,
            reasoningEffort: role.reasoningEffort,
            readOnly: role.readOnly,
          }
          runs.set(record.childId, record)
          void activation.result.then(
            (result) => {
              record.stopReason = result.stopReason
              record.settledAt = Date.now()
              record.status = result.stopReason === 'completed' ? 'completed' : result.stopReason === 'aborted' ? 'cancelled' : 'failed'
              trimRuns()
            },
            (error) => {
              record.stopReason = 'error'
              record.error = error instanceof Error ? error.message : String(error)
              record.settledAt = Date.now()
              record.status = 'failed'
              trimRuns()
            },
          ).finally(() => {
            release(parentId, role.id)
          })
          return { kind: 'activation', subagentId: activation.childId, role: role.id }
        } catch (error) {
          release(parentId, role.id)
          throw error
        }
      },
    }
  }

  /** Build the prompt section over the current role list. */
  function promptDefinition() {
    return {
      name: 'tool:multi-agent',
      order: PROMPT_ORDER,
      text: promptSection(store.list()),
      interpolate: false,
    }
  }

  let disposeSurface = () => {}
  let disposed = false
  /** Reinstall tool and prompt section after a role change. */
  function mountSurface() {
    if (disposed) return
    disposeSurface()
    disposeSurface = ctx.effect(() => {
      const disposeTool = ctx.tools.register(toolDefinition())
      const disposePrompt = ctx.systemPrompt.section(promptDefinition())
      return () => {
        disposePrompt()
        disposeTool()
      }
    }, 'multi-agent: delegation surface')
  }
  mountSurface()
  // The durable document may differ from the seeded defaults; reinstall once
  // its initial load commits so the model sees the stored roles.
  void store.ready.then(mountSurface)
  const unsubscribe = store.subscribe(mountSurface)
  ctx.effect(() => () => {
    disposed = true
    unsubscribe()
    disposeSurface()
  }, 'multi-agent: role subscription')
  ctx.effect(() => () => store.flush(), 'multi-agent: pending role writes')

  /** One detached roster row from a catalog entry and its optional run record. */
  function runRow(entry) {
    const record = runs.get(entry.id)
    const live = ctx.agents.get(entry.id)
    const status = record === undefined
      ? (live?.status === 'running' ? 'running' : 'idle')
      : record.status
    return {
      id: entry.id,
      parentId: entry.parentId,
      depth: entry.depth,
      mode: entry.mode,
      label: entry.label ?? record?.label ?? entry.id,
      hasChildren: entry.hasChildren === true,
      status,
      roleId: record?.roleId ?? null,
      roleName: record?.roleName ?? null,
      startedAt: record?.startedAt ?? null,
      settledAt: record?.settledAt ?? null,
      stopReason: record?.stopReason ?? null,
      error: record?.error ?? null,
      provider: record?.provider ?? null,
      model: record?.model ?? null,
      reasoningEffort: record?.reasoningEffort ?? null,
      readOnly: record?.readOnly === true,
    }
  }

  /**
   * Read the whole descendant roster for one session and merge it with this
   * plugin's role runs.
   * @param parentSessionId - root session shown by the roster.
   * @returns rows, role summaries, and traversal diagnostics.
   */
  async function roster(parentSessionId) {
    const roles = store.list()
    let entries = []
    let failure = null
    try {
      entries = await ctx.subagents.listDescendants(parentSessionId)
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error)
    }
    const rows = []
    const diagnostics = []
    for (const entry of entries) {
      if (entry.kind === 'child') rows.push(runRow(entry))
      else diagnostics.push({ id: entry.id, reason: entry.reason })
    }
    // A just-published run may not have reached the durable catalog yet; merge
    // this plugin's own records so the roster reflects it on the next poll.
    const byId = new Map(rows.map((row) => [row.id, row]))
    let added = true
    while (added) {
      added = false
      for (const record of runs.values()) {
        if (byId.has(record.childId)) continue
        const parent = record.parentSessionId === parentSessionId
          ? { depth: 0 }
          : byId.get(record.parentSessionId)
        if (parent === undefined) continue
        const row = {
          id: record.childId,
          parentId: record.parentSessionId,
          depth: parent.depth + 1,
          mode: 'continuable',
          label: record.label,
          hasChildren: false,
          status: record.status,
          roleId: record.roleId,
          roleName: record.roleName,
          startedAt: record.startedAt,
          settledAt: record.settledAt,
          stopReason: record.stopReason,
          error: record.error,
          provider: record.provider,
          model: record.model,
          reasoningEffort: record.reasoningEffort,
          readOnly: record.readOnly,
        }
        rows.push(row)
        byId.set(row.id, row)
        added = true
      }
    }
    const running = rows.filter((row) => row.status === 'running').length
    return {
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        provider: role.provider,
        model: role.model,
        reasoningEffort: role.reasoningEffort,
        maxParallel: role.maxParallel,
        readOnly: role.readOnly,
      })),
      rows,
      diagnostics,
      failure,
      summary: { running, total: rows.length },
    }
  }

  /** Route endpoint table; every business failure is a 200 `ok:false` envelope. */
  const endpoints = {
    async 'roles.list'() {
      await store.ready
      return {
        ok: true,
        value: {
          roles: store.list(),
          efforts: EFFORTS,
          limits: { minParallel: MIN_PARALLEL, maxParallel: MAX_PARALLEL },
        },
      }
    },
    async 'roles.save'(payload) {
      const role = await store.save(payload?.role ?? payload ?? {})
      return { ok: true, value: { role } }
    },
    async 'roles.delete'(payload) {
      return { ok: true, value: { removed: await store.remove(String(payload?.id ?? '')) } }
    },
    async 'roles.reset'() {
      return { ok: true, value: { roles: await store.reset() } }
    },
    async 'runs.list'(payload) {
      const parentSessionId = payload?.parentSessionId
      if (typeof parentSessionId !== 'string' || parentSessionId.length === 0) {
        throw new ProbeError('multi-agent/bad-request', 'parentSessionId is required')
      }
      return { ok: true, value: await roster(parentSessionId) }
    },
    async 'runs.stop'(payload) {
      const parentSessionId = payload?.parentSessionId
      const childId = payload?.childId
      if (typeof parentSessionId !== 'string' || parentSessionId.length === 0) {
        throw new ProbeError('multi-agent/bad-request', 'parentSessionId is required')
      }
      if (typeof childId !== 'string' || childId.length === 0) {
        throw new ProbeError('multi-agent/bad-request', 'childId is required')
      }
      let entries
      try {
        entries = await ctx.subagents.listDescendants(parentSessionId)
      } catch (error) {
        throw new ProbeError('multi-agent/catalog-unavailable', error instanceof Error ? error.message : String(error))
      }
      const entry = entries.find((candidate) => candidate.kind === 'child' && candidate.id === childId)
      if (entry === undefined) throw new ProbeError('multi-agent/not-found', 'that subagent is not a descendant of this session')
      try {
        ctx.subagents.interrupt(childId, { kind: 'user', parentSessionId: entry.parentId })
      } catch (error) {
        throw new ProbeError('multi-agent/interrupt-failed', error instanceof Error ? error.message : String(error))
      }
      return { ok: true, value: { childId, stopped: true } }
    },
  }

  /**
   * One authenticated POST route: `{ endpoint, payload }` in, JSON envelope out.
   * @param request - browser request.
   * @returns JSON response.
   */
  async function serve(request) {
    let body
    try {
      body = await request.json()
    } catch {
      return json({ ok: false, error: { code: 'multi-agent/bad-request', message: 'body is not JSON' } }, 400)
    }
    const handler = typeof body?.endpoint === 'string' && Object.prototype.hasOwnProperty.call(endpoints, body.endpoint)
      ? endpoints[body.endpoint]
      : undefined
    if (handler === undefined) {
      return json({ ok: false, error: { code: 'multi-agent/unknown-endpoint', message: `unknown endpoint ${String(body?.endpoint)}` } }, 404)
    }
    try {
      return json(await handler(body?.payload))
    } catch (error) {
      const code = isRoleError(error) || error instanceof ProbeError ? error.code : 'multi-agent/failed'
      return json({
        ok: false,
        error: { code, message: error instanceof Error ? error.message : String(error) },
      })
    }
  }

  ctx.inject(['connection'], (remoteCtx) => {
    remoteCtx.effect(() => {
      const dispose = remoteCtx.connection.fetch.register({
        path: ROUTE_PATH,
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: serve,
      })
      return async () => {
        await dispose()
      }
    }, 'multi-agent: roster route')
  })
}

/** JSON response helper. */
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}
