/**
 * Host half of the TodoList bundle.
 *
 * Owns the shared task list (durable JSON under $DSH_HOME/todolist), the
 * authenticated browser channel the panel reads and writes, the `todolist`
 * agent tool, the prompt section describing the claim protocol, and the wake
 * loop that puts a waiting task in front of a live agent.
 */
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

/** Plugin name registered with the Loader. */
export const name = 'todolist'

/** Host services this plugin consumes. */
export const inject = ['tools', 'systemPrompt', 'agents']

/** Exact Fetch route the panel posts to. */
const ROUTE_PATH = '/api/todolist'
const DATA_VERSION = 1
const MAX_TITLE = 300
const MAX_NOTES = 4000
const MAX_RESULT = 2000
const WAKE_DEBOUNCE_MS = 400
const WAKE_COOLDOWN_MS = 60000
const MAX_LIST_LINES = 8
const PRIORITIES = new Set(['low', 'normal', 'high'])
const STATES = new Set(['todo', 'doing', 'done'])
const PRIORITY_RANK = { high: 0, normal: 1, low: 2 }
const STATUS_RANK = { doing: 0, todo: 1, done: 2 }
const MAX_TOOL_TASKS = 100

const TOOL_DESCRIPTION = [
  'Manage the TodoList shared by every session.',
  'A task is worked on only after it is claimed: `claim` takes one task (or the next unclaimed one),',
  'then do the work with your other tools and record the outcome with `complete`.',
  'Actions: list, add, claim, update, complete, release.',
].join(' ')

const PROMPT_SECTION = `## TodoList

The TodoList is shared by every session and is managed through the \`todolist\` tool. Tasks created by the user are unassigned. When the user asks you to work on the list, or a TodoList wake message arrives, call \`todolist\` with \`{"action":"claim"}\` to take exactly one task before starting it, then do the work and finish with \`{"action":"complete","taskId":"<id>","result":"<one-line outcome>"}\`. Never work on a task you have not claimed, keep only one claimed task at a time, and use \`release\` if you cannot finish it.`

/** One plain task document as persisted and returned to the panel. */
function normalizeTask(raw) {
  const createdAt = Number.isFinite(raw?.createdAt) ? raw.createdAt : Date.now()
  return {
    id: String(raw?.id ?? ''),
    title: typeof raw?.title === 'string' ? raw.title : '',
    notes: typeof raw?.notes === 'string' ? raw.notes : '',
    status: STATES.has(raw?.status) ? raw.status : 'todo',
    priority: PRIORITIES.has(raw?.priority) ? raw.priority : 'normal',
    createdAt,
    updatedAt: Number.isFinite(raw?.updatedAt) ? raw.updatedAt : createdAt,
    completedAt: Number.isFinite(raw?.completedAt) ? raw.completedAt : null,
    assignee: typeof raw?.assignee === 'string' ? raw.assignee : null,
    claimedAt: Number.isFinite(raw?.claimedAt) ? raw.claimedAt : null,
    result: typeof raw?.result === 'string' ? raw.result : '',
    createdBy: raw?.createdBy === 'agent' ? 'agent' : 'user',
    createdBySession: typeof raw?.createdBySession === 'string' ? raw.createdBySession : null,
  }
}

/** Project a stored task into the detached value handed to callers. */
function view(task) {
  return {
    id: task.id,
    title: task.title,
    notes: task.notes,
    status: task.status,
    priority: task.priority,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt,
    assignee: task.assignee,
    claimedAt: task.claimedAt,
    result: task.result,
    createdBy: task.createdBy,
    createdBySession: task.createdBySession,
  }
}

/** Absolute path of the durable task document. */
function dataFile() {
  const root = process.env.DSH_HOME || path.join(homedir(), '.dsh')
  return path.join(root, 'todolist', 'tasks.json')
}

/** Trim and bound a user-supplied text field. */
function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

/** Claim order: high priority first, then oldest first. */
function claimOrder(left, right) {
  return (PRIORITY_RANK[left.priority] ?? 1) - (PRIORITY_RANK[right.priority] ?? 1)
    || left.createdAt - right.createdAt
}

/**
 * Open the task store, loading the durable document once and serializing
 * every write behind the previous one.
 * @param ctx - owning plugin context, used for diagnostics.
 * @returns store operations; `ready` settles after the initial load.
 */
function createStore(ctx) {
  const file = dataFile()
  const data = { version: DATA_VERSION, revision: 0, tasks: [] }
  let chain = Promise.resolve()

  const ready = (async () => {
    let source
    try {
      source = await readFile(file, 'utf8')
    } catch (error) {
      if (error?.code === 'ENOENT') return
      ctx.logger.warn(`todolist: cannot read ${file}: ${String(error)}`)
      return
    }
    try {
      const parsed = JSON.parse(source)
      if (!parsed || !Array.isArray(parsed.tasks)) throw new Error('missing tasks array')
      data.tasks = parsed.tasks.map(normalizeTask).filter((task) => task.id.length > 0 && task.title.length > 0)
      data.revision = Number.isSafeInteger(parsed.revision) ? parsed.revision : 0
    } catch (error) {
      ctx.logger.warn(`todolist: ignoring malformed ${file}: ${String(error)}`)
    }
  })()

  /** Publish the current in-memory state, then resolve after it is durable. */
  function persist() {
    const body = JSON.stringify({ version: DATA_VERSION, revision: data.revision, tasks: data.tasks }, null, 2)
    const tmp = `${file}.${process.pid}.${randomUUID().slice(0, 8)}.tmp`
    chain = chain.then(async () => {
      await mkdir(path.dirname(file), { recursive: true, mode: 0o700 })
      await writeFile(tmp, body, { encoding: 'utf8', mode: 0o600 })
      await rename(tmp, file)
    }).catch((error) => {
      ctx.logger.warn(`todolist: cannot persist ${file}: ${String(error)}`)
    })
    return chain
  }

  /** Apply one mutation to live state and schedule its durable write. */
  function commit(mutate) {
    const value = mutate(data)
    data.revision += 1
    persist()
    return value
  }

  /** Locate one task by id. */
  function find(id) {
    return data.tasks.find((task) => task.id === id)
  }

  /** Fresh id that no stored task uses. */
  function mintId() {
    for (;;) {
      const id = randomUUID().replaceAll('-', '').slice(0, 8)
      if (!find(id)) return id
    }
  }

  return {
    ready,
    file,
    flush: () => chain,
    snapshot() {
      return { revision: data.revision, tasks: data.tasks.map(view) }
    },
    pending() {
      return data.tasks.filter((task) => task.status === 'todo').sort(claimOrder)
    },
    doingFor(sessionId) {
      return data.tasks.find((task) => task.status === 'doing' && task.assignee === sessionId)
    },
    get(id) {
      const task = find(id)
      return task === undefined ? undefined : view(task)
    },
    add(input) {
      const now = Date.now()
      return commit(() => {
        const task = {
          id: mintId(),
          title: input.title,
          notes: input.notes,
          status: 'todo',
          priority: input.priority,
          createdAt: now,
          updatedAt: now,
          completedAt: null,
          assignee: null,
          claimedAt: null,
          result: '',
          createdBy: input.createdBy,
          createdBySession: input.createdBySession ?? null,
        }
        data.tasks.push(task)
        return view(task)
      })
    },
    update(id, patch) {
      return commit(() => {
        const task = find(id)
        if (task === undefined) return undefined
        task.title = patch.title ?? task.title
        task.notes = patch.notes ?? task.notes
        task.priority = patch.priority ?? task.priority
        task.updatedAt = Date.now()
        return view(task)
      })
    },
    claim(id, sessionId) {
      const doing = data.tasks.find((task) => task.status === 'doing' && task.assignee === sessionId)
      if (doing !== undefined && doing.id !== id) {
        return { ok: false, reason: 'busy', task: view(doing) }
      }
      const task = id === undefined
        ? data.tasks.filter((candidate) => candidate.status === 'todo').sort(claimOrder)[0]
        : find(id)
      if (task === undefined) return { ok: false, reason: 'not-found' }
      if (task.status === 'done') return { ok: false, reason: 'done', task: view(task) }
      if (task.assignee !== null && task.assignee !== sessionId) {
        return { ok: false, reason: 'already-claimed', task: view(task) }
      }
      return commit(() => {
        const now = Date.now()
        task.status = 'doing'
        task.assignee = sessionId
        task.claimedAt = now
        task.updatedAt = now
        return { ok: true, task: view(task) }
      })
    },
    complete(id, sessionId, result) {
      const task = find(id)
      if (task === undefined) return { ok: false, reason: 'not-found' }
      if (task.assignee !== null && sessionId !== undefined && task.assignee !== sessionId) {
        return { ok: false, reason: 'not-assigned', task: view(task) }
      }
      if (task.status === 'done') return { ok: true, task: view(task), unchanged: true }
      return commit(() => {
        const now = Date.now()
        task.status = 'done'
        task.completedAt = now
        task.updatedAt = now
        task.result = result === undefined || result.length === 0 ? task.result : result
        return { ok: true, task: view(task) }
      })
    },
    setStatus(id, status) {
      return commit(() => {
        const task = find(id)
        if (task === undefined) return undefined
        const now = Date.now()
        task.status = status
        task.updatedAt = now
        if (status === 'done') {
          task.completedAt = now
        } else {
          task.completedAt = null
          task.result = ''
          task.assignee = null
          task.claimedAt = null
        }
        return view(task)
      })
    },
    release(id) {
      return commit(() => {
        const task = find(id)
        if (task === undefined) return undefined
        if (task.status === 'done') return view(task)
        task.status = 'todo'
        task.assignee = null
        task.claimedAt = null
        task.updatedAt = Date.now()
        return view(task)
      })
    },
    releaseSession(sessionId) {
      const owned = data.tasks.filter((task) => task.status === 'doing' && task.assignee === sessionId)
      if (owned.length === 0) return 0
      return commit(() => {
        const now = Date.now()
        for (const task of owned) {
          task.status = 'todo'
          task.assignee = null
          task.claimedAt = null
          task.updatedAt = now
        }
        return owned.length
      })
    },
    remove(id) {
      return commit(() => {
        const index = data.tasks.findIndex((task) => task.id === id)
        if (index === -1) return false
        data.tasks.splice(index, 1)
        return true
      })
    },
    clearDone() {
      return commit(() => {
        const before = data.tasks.length
        data.tasks = data.tasks.filter((task) => task.status !== 'done')
        return before - data.tasks.length
      })
    },
  }
}

/** One text block for a tool result. */
function line(value) {
  return [{ type: 'text', text: value }]
}

/** Compact display form of a session id, without its `session-` prefix. */
function shortSession(id) {
  const raw = id.startsWith('session-') ? id.slice('session-'.length) : id
  return raw.slice(0, 8)
}

/** Short label for one task row inside model-facing text. */
function taskLine(task) {
  const flags = [`#${task.id}`, task.status]
  if (task.priority !== 'normal') flags.push(task.priority)
  const owner = task.assignee === null ? '' : `, claimed by session ${shortSession(task.assignee)}`
  return `- ${flags.join(' · ')} · ${task.title}${owner}`
}

/**
 * Render a store operation result for the model.
 * @param outcome - store result carrying either `task` or a refusal reason.
 * @returns one content block with the rendered text.
 */
function renderOutcome(outcome) {
  if (outcome.ok === true) {
    const task = outcome.task
    const detail = [`#${task.id} (${task.status}) ${task.title}`]
    if (task.notes.length > 0) detail.push(`Notes: ${task.notes}`)
    if (task.result.length > 0) detail.push(`Result: ${task.result}`)
    return line(detail.join('\n'))
  }
  const task = outcome.task
  const suffix = task === undefined ? '' : ` Current: ${taskLine(task)}`
  switch (outcome.reason) {
    case 'busy':
      return line(`You already hold a claimed task; complete or release it first.${suffix}`)
    case 'not-found':
      return line('No task has that id; call list to read current tasks.')
    case 'done':
      return line(`That task is already done.${suffix}`)
    case 'already-claimed':
      return line(`Another session claimed that task; claim a different one.${suffix}`)
    case 'not-assigned':
      return line(`That task is claimed by another session; cannot complete it.${suffix}`)
    default:
      return line(`Operation refused (${String(outcome.reason)}).${suffix}`)
  }
}

/**
 * Build the `todolist` tool definition over one store.
 * @param store - task store.
 * @param wake - wake coordinator used after an agent creates work.
 * @returns registry-ready tool definition.
 */
function todoTool(store, wake) {
  return {
    name: 'todolist',
    description: TOOL_DESCRIPTION,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'add', 'claim', 'update', 'complete', 'release'],
          description: 'Operation to perform.',
        },
        taskId: {
          type: 'string',
          description: 'Task id for claim, update, complete, or release. Omit on claim to take the next unclaimed task.',
        },
        title: { type: 'string', description: 'Task title for add, or the replacement title for update.' },
        notes: { type: 'string', description: 'Optional details for add or update (what the task needs).' },
        priority: { type: 'string', enum: ['low', 'normal', 'high'], description: 'Task priority; defaults to normal.' },
        result: { type: 'string', description: 'One-line outcome recorded by complete.' },
        status: {
          type: 'string',
          enum: ['todo', 'doing', 'done'],
          description: 'Optional status filter for list.',
        },
      },
      required: ['action'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          tasks: { type: 'array', items: { type: 'object', additionalProperties: true } },
          task: { type: 'object', additionalProperties: true },
          message: { type: 'string' },
        },
      },
      render: (_args, value) => line(typeof value?.message === 'string' ? value.message : JSON.stringify(value)),
    },
    async execute(args, exec) {
      await store.ready
      const action = args?.action
      const agent = exec.agent
      if (action === 'list') {
        const status = args.status
        if (status !== undefined && !STATES.has(status)) throw new Error('status must be todo, doing, or done')
        const matched = store.snapshot().tasks
          .filter((task) => status === undefined || task.status === status)
          .sort((left, right) => (STATUS_RANK[left.status] ?? 3) - (STATUS_RANK[right.status] ?? 3)
            || claimOrder(left, right))
        const tasks = matched.slice(0, MAX_TOOL_TASKS)
        if (tasks.length === 0) return { message: 'The TodoList has no matching tasks.' }
        const omitted = matched.length - tasks.length
        return {
          tasks,
          message: [
            tasks.map(taskLine).join('\n'),
            omitted > 0 ? `…and ${omitted} more; narrow with status or open the TodoList panel.` : '',
          ].filter((part) => part.length > 0).join('\n'),
        }
      }
      if (action === 'add') {
        const title = text(args.title, MAX_TITLE)
        if (title.length === 0) throw new Error('add requires a non-empty title')
        const task = store.add({
          title,
          notes: text(args.notes, MAX_NOTES),
          priority: PRIORITIES.has(args.priority) ? args.priority : 'normal',
          createdBy: 'agent',
          createdBySession: agent?.id,
        })
        return { task, message: `Added ${taskLine(task).slice(2)}` }
      }
      if (action === 'claim') {
        if (agent === undefined) throw new Error('claim requires an agent session')
        const id = typeof args.taskId === 'string' && args.taskId.length > 0 ? args.taskId : undefined
        const outcome = store.claim(id, agent.id)
        if (outcome.ok === true) {
          await wake.afterChange()
          return { task: outcome.task, message: `Claimed ${taskLine(outcome.task).slice(2)}\nDo the work now, then call complete with a short result.` }
        }
        // A refusal is the model's cue to pick another task, never a wake.
        return { message: renderOutcome(outcome)[0].text }
      }
      if (action === 'update') {
        const id = text(args.taskId, 64)
        if (id.length === 0) throw new Error('update requires taskId')
        const patch = {}
        if (args.title !== undefined) {
          patch.title = text(args.title, MAX_TITLE)
          if (patch.title.length === 0) throw new Error('title cannot be empty')
        }
        if (args.notes !== undefined) patch.notes = text(args.notes, MAX_NOTES)
        if (args.priority !== undefined) {
          if (!PRIORITIES.has(args.priority)) throw new Error('priority must be low, normal, or high')
          patch.priority = args.priority
        }
        const task = store.update(id, patch)
        if (task === undefined) return { message: renderOutcome({ ok: false, reason: 'not-found' })[0].text }
        return { task, message: `Updated ${taskLine(task).slice(2)}` }
      }
      if (action === 'complete') {
        const id = text(args.taskId, 64)
        if (id.length === 0) throw new Error('complete requires taskId')
        const outcome = store.complete(id, agent?.id, text(args.result, MAX_RESULT))
        if (outcome.ok === true) await wake.afterChange()
        return { task: outcome.task, message: renderOutcome(outcome)[0].text }
      }
      if (action === 'release') {
        const id = text(args.taskId, 64)
        if (id.length === 0) throw new Error('release requires taskId')
        const task = store.release(id)
        if (task === undefined) return { message: renderOutcome({ ok: false, reason: 'not-found' })[0].text }
        await wake.afterChange()
        return { task, message: `Released ${taskLine(task).slice(2)}` }
      }
      throw new Error(`unknown action ${String(action)}; use list, add, claim, update, complete, or release`)
    },
  }
}

/**
 * Coordinate agent wakes for waiting tasks.
 *
 * A wake is debounced so a burst of additions produces one message, and it is
 * always delivered to the most recently active top-level agent so a claimed
 * task lands in a visible Session.
 * @param ctx - plugin context owning timers and agent listeners.
 * @param store - task store.
 * @returns scheduling and result helpers.
 */
function createWaker(ctx, store) {
  let timer
  let disposed = false
  let lastWake
  const lastActive = new Map()

  ctx.on('agent/created', ({ agent }) => {
    lastActive.set(agent.id, Date.now())
  })
  ctx.on('agent/status', ({ agent, status }) => {
    if (status === 'running') lastActive.set(agent.id, Date.now())
  })
  ctx.effect(() => () => {
    disposed = true
    clearTimeout(timer)
    timer = undefined
  }, 'todolist: wake timer')

  /** The freshest live top-level agent, preferring an idle one. */
  function pick() {
    const roots = ctx.agents.roots().filter((agent) => (agent.session?.header?.delegationDepth ?? 0) === 0)
    if (roots.length === 0) return undefined
    const idle = roots.filter((agent) => agent.status === 'idle')
    const pool = idle.length > 0 ? idle : roots
    let best = pool[0]
    for (const agent of pool) {
      if ((lastActive.get(agent.id) ?? 0) > (lastActive.get(best.id) ?? 0)) best = agent
    }
    return best
  }

  /** Compose the model-facing wake message for the current pending tasks. */
  function notice(pending) {
    const shown = pending.slice(0, MAX_LIST_LINES).map(taskLine).join('\n')
    const more = pending.length > MAX_LIST_LINES ? `\n…and ${pending.length - MAX_LIST_LINES} more.` : ''
    return [
      `TodoList has ${pending.length} unclaimed task${pending.length === 1 ? '' : 's'}:`,
      shown,
      more,
      '',
      'Do not reply conversationally. Call the todolist tool with action "claim" to take exactly one task, do the work, then record the outcome with action "complete".',
    ].join('\n')
  }

  /** Deliver one wake message now, if a live agent and waiting task exist. */
  function wakeNow() {
    if (disposed) return undefined
    const pending = store.pending()
    if (pending.length === 0) return undefined
    const agent = pick()
    if (agent === undefined) return undefined
    const key = pending.map((task) => task.id).sort().join(',')
    const now = Date.now()
    // A claim or completion re-checks the queue within the same turn; do not
    // queue a second wake for a pending set the agent was already told about.
    if (lastWake !== undefined && lastWake.key === key && lastWake.sessionId === agent.id
      && now - lastWake.at < WAKE_COOLDOWN_MS) return undefined
    agent.followup({
      id: randomUUID(),
      role: 'user',
      content: [{ type: 'text', text: notice(pending) }],
      source: { kind: 'todolist' },
    })
    lastWake = { key, sessionId: agent.id, at: now }
    return agent.id
  }

  /** Debounce one wake attempt; failures never escape into a tool result. */
  function schedule() {
    if (disposed) return
    clearTimeout(timer)
    void store.ready.then(() => {
      if (disposed) return
      clearTimeout(timer)
      timer = setTimeout(() => {
        timer = undefined
        try {
          wakeNow()
        } catch (error) {
          ctx.logger.warn(`todolist: wake failed: ${String(error)}`)
        }
      }, WAKE_DEBOUNCE_MS)
    })
  }

  /** Wake immediately after an agent changed the queue (claim, complete, release). */
  async function afterChange() {
    await store.ready
    if (disposed) return
    const pending = store.pending()
    if (pending.length === 0) return
    try {
      wakeNow()
    } catch (error) {
      ctx.logger.warn(`todolist: wake failed: ${String(error)}`)
    }
  }

  return { schedule, wakeNow, afterChange, pick }
}

/** Validate an incoming panel payload as a plain record. */
function recordOf(payload) {
  return payload !== null && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}
}

/**
 * Browser-facing operations shared by the panel.
 * @param store - task store.
 * @param wake - wake coordinator.
 * @returns endpoint table returning `{ ok, value }` handler results.
 */
function createEndpoints(store, wake) {
  /** Require a string payload field. */
  function required(value, label, max) {
    const trimmed = text(value, max)
    if (trimmed.length === 0) throw Object.assign(new Error(`${label} is required`), { code: 'todolist/bad-request' })
    return trimmed
  }

  /** Shorthand for one successful handler result. */
  function success(value) {
    return { ok: true, value }
  }

  return {
    async list() {
      await store.ready
      return success(store.snapshot())
    },
    async add(payload) {
      await store.ready
      const input = recordOf(payload)
      const title = required(input.title, 'title', MAX_TITLE)
      const priority = PRIORITIES.has(input.priority) ? input.priority : 'normal'
      const task = store.add({
        title,
        notes: text(input.notes, MAX_NOTES),
        priority,
        createdBy: 'user',
      })
      wake.schedule()
      return success({ task })
    },
    async update(payload) {
      await store.ready
      const input = recordOf(payload)
      const id = required(input.id, 'id', 64)
      const patch = {}
      if (input.title !== undefined) patch.title = required(input.title, 'title', MAX_TITLE)
      if (input.notes !== undefined) patch.notes = text(input.notes, MAX_NOTES)
      if (input.priority !== undefined) {
        if (!PRIORITIES.has(input.priority)) throw Object.assign(new Error('invalid priority'), { code: 'todolist/bad-request' })
        patch.priority = input.priority
      }
      const task = store.update(id, patch)
      if (task === undefined) return success({ ok: false, reason: 'not-found', task: null })
      return success({ ok: true, task })
    },
    async setStatus(payload) {
      await store.ready
      const input = recordOf(payload)
      const id = required(input.id, 'id', 64)
      if (input.status !== 'done' && input.status !== 'todo') {
        throw Object.assign(new Error('status must be done or todo'), { code: 'todolist/bad-request' })
      }
      const task = store.setStatus(id, input.status)
      if (task === undefined) return success({ ok: false, reason: 'not-found', task: null })
      wake.schedule()
      return success({ ok: true, task })
    },
    async release(payload) {
      await store.ready
      const id = required(recordOf(payload).id, 'id', 64)
      const task = store.release(id)
      if (task === undefined) return success({ ok: false, reason: 'not-found', task: null })
      wake.schedule()
      return success({ ok: true, task })
    },
    async remove(payload) {
      await store.ready
      const id = required(recordOf(payload).id, 'id', 64)
      const removed = store.remove(id)
      return success({ ok: removed, reason: removed ? undefined : 'not-found' })
    },
    async clearDone() {
      await store.ready
      return success({ ok: true, removed: store.clearDone() })
    },
    async wake() {
      await store.ready
      try {
        return success({ ok: true, woken: wake.wakeNow() ?? null })
      } catch (error) {
        return success({ ok: false, reason: String(error?.message ?? error), woken: null })
      }
    },
  }
}

/** JSON response for one panel request outcome. */
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

/**
 * Exact Fetch route serving the panel inside Connection's authentication
 * fence. The browser sends `{ endpoint, payload }`; every business failure is
 * a 200 with `{ ok: false, error }` so the page can show the reason.
 * @param endpoints - endpoint table from {@link createEndpoints}.
 * @returns route ready for `connection.fetch.register`.
 */
function panelRoute(endpoints) {
  return {
    path: ROUTE_PATH,
    methods: ['POST'],
    requestBody: 'buffered',
    async fetch(request) {
      let body
      try {
        body = await request.json()
      } catch {
        return json({ ok: false, error: { code: 'todolist/bad-request', message: 'body is not JSON', details: {} } }, 400)
      }
      const endpoint = body?.endpoint
      const handler = typeof endpoint === 'string' ? endpoints[endpoint] : undefined
      if (handler === undefined) {
        return json({ ok: false, error: { code: 'todolist/unknown-endpoint', message: `unknown endpoint ${String(endpoint)}`, details: {} } }, 404)
      }
      try {
        return json(await handler(body?.payload))
      } catch (error) {
        return json({
          ok: false,
          error: {
            code: error?.code ?? 'todolist/failed',
            message: error instanceof Error ? error.message : String(error),
            details: {},
          },
        })
      }
    },
  }
}

/** Host plugin body. */
export function apply(ctx) {
  const store = createStore(ctx)
  const wake = createWaker(ctx, store)
  const endpoints = createEndpoints(store, wake)

  ctx.effect(() => () => store.flush(), 'todolist: pending writes')

  ctx.effect(() => ctx.tools.register(todoTool(store, wake)), 'todolist: tool')

  ctx.effect(() => ctx.systemPrompt.section({
    name: 'tool:todolist',
    order: 2650,
    text: PROMPT_SECTION,
    interpolate: false,
  }), 'todolist: prompt section')

  // Announce waiting work to an agent that starts with an empty queue of its
  // own, without waking it for a turn the user did not ask for.
  ctx.on('agent/created', ({ agent }) => {
    if ((agent.session?.header?.delegationDepth ?? 0) !== 0) return
    void store.ready.then(() => {
      const pending = store.pending()
      if (pending.length === 0) return
      try {
        agent.inject({
          id: randomUUID(),
          role: 'user',
          content: [{ type: 'text', text: `TodoList: ${pending.length} unclaimed task(s) waiting. Use the todolist tool with action "claim" to take one.\n${pending.slice(0, MAX_LIST_LINES).map(taskLine).join('\n')}` }],
          source: { kind: 'todolist' },
        })
      } catch (error) {
        ctx.logger.warn(`todolist: context injection failed: ${String(error)}`)
      }
    })
  })

  // A session that goes away must not strand its claimed task as "doing".
  ctx.on('agent/disposed', ({ agent }) => {
    void store.ready.then(() => {
      const released = store.releaseSession(agent.id)
      if (released > 0) wake.schedule()
    })
  })

  ctx.inject(['connection'], (remoteCtx) => {
    remoteCtx.effect(() => {
      const dispose = remoteCtx.connection.fetch.register(panelRoute(endpoints))
      return async () => {
        await dispose()
      }
    }, 'todolist: panel route')
  })
}
