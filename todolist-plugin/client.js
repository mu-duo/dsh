/**
 * Browser half of the TodoList bundle: a common todo-list page with filters,
 * priorities, claim state and per-task detail, reached from the sidebar
 * panel list and talking to the Host over its own authenticated RPC channel.
 */
window.__ModuleLoader__.load({
  id: '@tanlinfeng/dsh-todolist',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'todolist.panel'
    const ROUTE = '/api/todolist'
    const PANEL_ID = 'todolist'
    const POLL_MS = 2500

    const PRIORITY_RANK = { high: 0, normal: 1, low: 2 }
    const STATUS_RANK = { doing: 0, todo: 1, done: 2 }
    const PRIORITY_LABEL = { high: 'priority.high', normal: 'priority.normal', low: 'priority.low' }
    const STATUS_LABEL = { todo: 'status.todo', doing: 'status.doing', done: 'status.done' }
    const FILTERS = [
      ['all', 'filter.all'],
      ['todo', 'filter.todo'],
      ['doing', 'filter.doing'],
      ['done', 'filter.done'],
    ]

    const zh = {
      panel: '待办清单',
      intro: 'Agent 会从列表中认领任务并在会话里执行。',
      summary: '{todo} 待办 · {doing} 进行中 · {done} 已完成',
      'add.placeholder': '添加任务，按回车创建…',
      'add.priority': '优先级',
      'add.submit': '添加',
      'filter.all': '全部',
      'filter.todo': '待办',
      'filter.doing': '进行中',
      'filter.done': '已完成',
      'priority.high': '高',
      'priority.normal': '普通',
      'priority.low': '低',
      'status.todo': '待办',
      'status.doing': '进行中',
      'status.done': '已完成',
      'action.wake': '让 Agent 认领',
      'action.wakeHint': '通知当前活跃会话认领待办任务',
      'action.clearDone': '清除已完成',
      'wake.ok': '已通知会话「{session}」认领任务',
      'wake.none': '当前没有活跃会话；先打开一个会话，再点此按钮',
      'row.toggle': '切换完成状态',
      'row.unclaimed': '未认领',
      'row.claimedBy': '由 {session} 认领',
      'row.openSession': '打开认领该任务的会话',
      'row.created': '创建于 {time}',
      'row.notes': '说明',
      'row.result': '结果',
      'row.release': '释放认领',
      'row.delete': '删除任务',
      'row.confirmDelete': '再次点击删除',
      'row.expand': '展开详情',
      'row.collapse': '收起详情',
      'empty.title': '还没有任务',
      'empty.hint': '在上方输入框中添加一条待办，Agent 会自动认领并执行。',
      'empty.filterTitle': '这个分组没有任务',
      'empty.filterHint': '切换到其他分组，或添加一条新的待办。',
      'error.load': '无法读取待办列表：{message}',
      'error.action': '操作失败：{message}',
    }

    const en = {
      panel: 'TodoList',
      intro: 'Agents claim tasks from this list and execute them in their sessions.',
      summary: '{todo} to do · {doing} in progress · {done} done',
      'add.placeholder': 'Add a task and press Enter…',
      'add.priority': 'Priority',
      'add.submit': 'Add',
      'filter.all': 'All',
      'filter.todo': 'To do',
      'filter.doing': 'In progress',
      'filter.done': 'Done',
      'priority.high': 'High',
      'priority.normal': 'Normal',
      'priority.low': 'Low',
      'status.todo': 'To do',
      'status.doing': 'In progress',
      'status.done': 'Done',
      'action.wake': 'Ask an agent to claim',
      'action.wakeHint': 'Notify a live session to claim a pending task',
      'action.clearDone': 'Clear done',
      'wake.ok': 'Session “{session}” was asked to claim a task',
      'wake.none': 'No live session; open one first, then try again',
      'row.toggle': 'Toggle completion',
      'row.unclaimed': 'Unclaimed',
      'row.claimedBy': 'Claimed by {session}',
      'row.openSession': 'Open the claiming session',
      'row.created': 'Created {time}',
      'row.notes': 'Notes',
      'row.result': 'Result',
      'row.release': 'Release claim',
      'row.delete': 'Delete task',
      'row.confirmDelete': 'Click again to delete',
      'row.expand': 'Show details',
      'row.collapse': 'Hide details',
      'empty.title': 'No tasks yet',
      'empty.hint': 'Add a task above; an agent will claim and execute it.',
      'empty.filterTitle': 'Nothing in this group',
      'empty.filterHint': 'Switch groups, or add a new task.',
      'error.load': 'Cannot read the TodoList: {message}',
      'error.action': 'Action failed: {message}',
    }

    const CSS = [
      '.tdl-page{box-sizing:border-box;width:100%;height:100%;min-height:0;display:flex;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.55}',
      '.tdl-scroll{flex:1;min-height:0;overflow:auto;scrollbar-gutter:stable}',
      '.tdl-content{max-width:760px;margin:0 auto;padding:0 clamp(20px,4vw,40px) 56px}',
      '.tdl-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;padding-top:28px;margin-bottom:16px}',
      '[data-platform=darwin] .tdl-head{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}',
      '.tdl-headText{min-width:0}',
      '.tdl-headText h1{margin:0;font-size:20px;font-weight:500;line-height:28px}',
      '.tdl-intro{margin:4px 0 0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}',
      '.tdl-headActions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.tdl-ghost{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:16px;border:.5px solid var(--dsw-alias-border-l1,var(--dsw-alias-border-l2));background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;line-height:20px;white-space:nowrap;cursor:pointer}',
      '.tdl-ghost:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent));color:var(--dsw-alias-label-primary)}',
      '.tdl-ghost:disabled{opacity:.45;cursor:default}',
      '.tdl-summary{display:flex;align-items:center;gap:12px;margin-bottom:14px}',
      '.tdl-summaryText{flex:none;color:var(--dsw-alias-label-secondary);font-size:12.5px;font-variant-numeric:tabular-nums}',
      '.tdl-progress{flex:1;height:4px;border-radius:2px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);overflow:hidden}',
      '.tdl-progressFill{height:100%;border-radius:2px;background:var(--dsw-alias-state-success-primary,var(--dsw-alias-brand-primary));transition:width .25s ease}',
      '@media (prefers-reduced-motion:reduce){.tdl-progressFill{transition:none}}',
      '.tdl-add{display:flex;align-items:center;gap:8px;padding:6px 8px 6px 12px;margin-bottom:16px;border:.5px solid var(--dsw-alias-border-l1,var(--dsw-alias-border-l2));border-radius:12px;background:var(--dsw-alias-bg-layer-1)}',
      '.tdl-add:focus-within{border-color:var(--dsw-alias-brand-primary)}',
      '.tdl-addIcon{display:inline-flex;flex:none;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}',
      '.tdl-add input{flex:1;min-width:0;height:34px;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;outline:none}',
      '.tdl-add input::placeholder{color:var(--dsw-alias-label-caption,var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary)))}',
      '.tdl-prioritySelect{height:28px;padding:0 6px;border:.5px solid transparent;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;cursor:pointer}',
      '.tdl-prioritySelect:hover{border-color:var(--dsw-alias-border-l1,var(--dsw-alias-border-l2))}',
      '.tdl-prioritySelect:disabled{opacity:.5;cursor:default}',
      '.tdl-addButton{height:32px;padding:0 14px;border:0;border-radius:9px;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-foreground,var(--dsw-alias-bg-base));font:inherit;font-size:13px;cursor:pointer}',
      '.tdl-addButton:hover:not(:disabled){filter:brightness(1.05)}',
      '.tdl-addButton:disabled{opacity:.45;cursor:default}',
      '.tdl-filters{display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:10px}',
      '.tdl-tab{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border:0;border-radius:14px;background:transparent;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font:inherit;font-size:13px;line-height:20px;cursor:pointer}',
      '.tdl-tab:hover{background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent))}',
      '.tdl-tab[data-active=true]{background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent));color:var(--dsw-alias-label-primary)}',
      '.tdl-count{font-size:11.5px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-variant-numeric:tabular-nums}',
      '.tdl-tab[data-active=true] .tdl-count{color:var(--dsw-alias-label-secondary)}',
      '.tdl-banner{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px;padding:9px 12px;border-radius:10px;font-size:12.5px;line-height:18px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);color:var(--dsw-alias-state-error-primary)}',
      '.tdl-banner[data-kind=notice]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent);color:var(--dsw-alias-brand-primary)}',
      '.tdl-bannerClose{flex:none;width:22px;height:22px;padding:0;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;line-height:1;cursor:pointer;opacity:.7}',
      '.tdl-bannerClose:hover{opacity:1}',
      '.tdl-rows{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}',
      '.tdl-row{display:flex;align-items:flex-start;gap:10px;padding:9px 8px 9px 10px;border-radius:10px}',
      '.tdl-row:hover{background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent))}',
      '.tdl-check{flex:none;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;margin-top:2px;padding:0;border:1.5px solid var(--dsw-alias-border-l2);border-radius:50%;background:transparent;color:var(--dsw-alias-label-primary-foreground,var(--dsw-alias-bg-base));cursor:pointer}',
      '.tdl-check:hover:not(:disabled){border-color:var(--dsw-alias-state-success-primary,var(--dsw-alias-brand-primary))}',
      '.tdl-check:disabled{cursor:default;opacity:.6}',
      '.tdl-row[data-doing=true] .tdl-check{border-color:var(--dsw-alias-brand-primary);border-style:dashed}',
      '.tdl-row[data-done=true] .tdl-check{background:var(--dsw-alias-state-success-primary,var(--dsw-alias-brand-primary));border-color:var(--dsw-alias-state-success-primary,var(--dsw-alias-brand-primary))}',
      '.tdl-rowMain{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}',
      '.tdl-rowHead{display:flex;align-items:center;gap:8px;min-width:0}',
      '.tdl-title{flex:1;min-width:0;padding:0;border:0;background:transparent;color:inherit;font:inherit;font-size:14px;line-height:22px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}',
      '.tdl-title:hover{text-decoration:underline;text-underline-offset:3px}',
      '.tdl-row[data-done=true] .tdl-title{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));text-decoration:line-through}',
      '.tdl-badges{display:inline-flex;align-items:center;gap:6px;flex:none}',
      '.tdl-priority{font-size:11px;line-height:18px;padding:0 7px;border-radius:9px;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);color:var(--dsw-alias-state-warn-primary)}',
      '.tdl-priority[data-level=low]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);color:var(--dsw-alias-label-secondary)}',
      '.tdl-doing{display:inline-flex;align-items:center;gap:5px;font-size:11px;line-height:18px;padding:0 7px;border-radius:9px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);color:var(--dsw-alias-brand-primary)}',
      '.tdl-dot{width:6px;height:6px;border-radius:50%;background:currentColor;animation:tdl-pulse 1.6s ease-in-out infinite}',
      '@keyframes tdl-pulse{0%,100%{opacity:1}50%{opacity:.3}}',
      '@media (prefers-reduced-motion:reduce){.tdl-dot{animation:none}}',
      '.tdl-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-size:12px;line-height:18px}',
      '.tdl-link{display:inline-flex;align-items:center;gap:4px;max-width:240px;padding:0;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}',
      '.tdl-link:hover{color:var(--dsw-alias-label-primary);text-decoration:underline;text-underline-offset:3px}',
      '.tdl-sep{opacity:.55}',
      '.tdl-detail{display:flex;flex-direction:column;gap:8px;margin-top:8px;padding:10px 12px;border-radius:10px;background:var(--dsw-alias-bg-layer-1)}',
      '.tdl-detailLabel{font-size:11px;letter-spacing:.02em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}',
      '.tdl-pre{margin:2px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:19px}',
      '.tdl-small{align-self:flex-start;height:26px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l1,var(--dsw-alias-border-l2));border-radius:13px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}',
      '.tdl-small:hover{color:var(--dsw-alias-label-primary)}',
      '.tdl-delete{flex:none;display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:26px;margin-top:1px;padding:0 6px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font:inherit;font-size:11.5px;white-space:nowrap;cursor:pointer;opacity:0;transition:opacity .12s}',
      '.tdl-row:hover .tdl-delete,.tdl-delete:focus-visible{opacity:1}',
      '.tdl-delete:hover{background:var(--dsw-alias-interactive-bg-hover-danger,var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent)));color:var(--dsw-alias-state-error-primary)}',
      '.tdl-delete[data-confirm=true]{opacity:1;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);color:var(--dsw-alias-state-error-primary)}',
      '.tdl-empty{display:flex;flex-direction:column;align-items:center;gap:4px;padding:44px 24px;border:.5px dashed var(--dsw-alias-border-l2);border-radius:14px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));text-align:center}',
      '.tdl-emptyTitle{margin:8px 0 0;font-size:14px;color:var(--dsw-alias-label-secondary)}',
      '.tdl-emptyHint{margin:0;max-width:420px;font-size:12.5px;line-height:19px}',
      '.tdl-page button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}',
    ].join('\n')

    /** Inline stroke icon composed of path data. */
    function strokes(size, paths, width) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 20 20',
        fill: 'none',
        'aria-hidden': true,
        style: { display: 'block' },
      }, paths.map((d, index) => h('path', {
        key: index,
        d,
        stroke: 'currentColor',
        strokeWidth: width ?? 1.6,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      })))
    }

    function IconPlus(size) {
      return strokes(size, ['M10 4v12', 'M4 10h12'], 1.7)
    }

    function IconCheck(size) {
      return strokes(size, ['M4.6 10.4l3.4 3.4 7.4-7.8'], 2)
    }

    function IconTrash(size) {
      return strokes(size, ['M4 6.5h12', 'M8 6.5V4.5h4v2', 'M6 6.5l.7 9h6.6l.7-9', 'M8.6 9v4', 'M11.4 9v4'], 1.4)
    }

    function IconUser(size) {
      return strokes(size, ['M10 10a3 3 0 100-6 3 3 0 000 6z', 'M4.5 16c.6-2.6 2.8-4 5.5-4s4.9 1.4 5.5 4'], 1.5)
    }

    function IconSpark(size) {
      return strokes(size, ['M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6L10 3z'], 1.5)
    }

    function IconList(size) {
      return strokes(size, ['M3.5 5.5l1.3 1.3 2.4-2.6', 'M9.5 5.6h7', 'M3.5 11.8l1.3 1.3 2.4-2.6', 'M9.5 11.9h7'], 1.5)
    }

    function IconEmpty(size) {
      return strokes(size, ['M5 3.5h10v13H5z', 'M7.5 7h5', 'M7.5 10h5', 'M7.5 13h3'], 1.3)
    }

    /** Sidebar glyph; the sidebar owns the accessible navigation label. */
    function PanelIcon({ size }) {
      return strokes(size ?? 20, ['M3.5 5.5l1.3 1.3 2.4-2.6', 'M9.7 5.7h7', 'M3.5 11.9l1.3 1.3 2.4-2.6', 'M9.7 12.1h7'], 1.5)
    }

    /** Compact display form of a session id, without its `session-` prefix. */
    function shortSession(id) {
      const raw = id.startsWith('session-') ? id.slice('session-'.length) : id
      return raw.slice(0, 8)
    }

    /** Localized short session label for a claim badge. */
    function sessionLabel(sessions, id) {
      if (typeof id !== 'string' || id.length === 0) return ''
      const row = sessions?.[id]
      return row?.displayTitle ?? `#${shortSession(id)}`
    }

    /** Readable local timestamp for a row. */
    function timeLabel(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return ''
      return new Date(value).toLocaleString(undefined, {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    /** Message text of an unknown thrown value. */
    function messageOf(error) {
      return error instanceof Error ? error.message : String(error)
    }

    /** The full-page todo panel. */
    function TodoPanel(props) {
      const t = props.t
      const call = props.call
      const openSession = props.openSession
      const sessions = props.useSessions((state) => state.byId)

      const [snapshot, setSnapshot] = React.useState({ revision: -1, tasks: [] })
      const [filter, setFilter] = React.useState('all')
      const [draft, setDraft] = React.useState('')
      const [priority, setPriority] = React.useState('normal')
      const [expanded, setExpanded] = React.useState(null)
      const [pending, setPending] = React.useState(false)
      const [error, setError] = React.useState('')
      const [notice, setNotice] = React.useState('')
      const [confirming, setConfirming] = React.useState(null)

      const refresh = React.useCallback(async (signal) => {
        try {
          const value = await call('list', {}, signal)
          if (!value || !Array.isArray(value.tasks)) return undefined
          setSnapshot((previous) => (previous.revision === value.revision ? previous : value))
          setError('')
          return value
        } catch (failure) {
          if (failure?.name === 'AbortError' || signal?.aborted === true) return undefined
          setError(t('error.load', { message: messageOf(failure) }))
          return undefined
        }
      }, [call, t])

      React.useEffect(() => {
        let disposed = false
        let timer
        const controller = new AbortController()
        const tick = async () => {
          if (disposed) return
          await refresh(controller.signal)
          if (!disposed) timer = setTimeout(tick, POLL_MS)
        }
        void tick()
        return () => {
          disposed = true
          controller.abort()
          clearTimeout(timer)
        }
      }, [refresh])

      React.useEffect(() => {
        if (notice.length === 0) return undefined
        const timer = setTimeout(() => setNotice(''), 5000)
        return () => clearTimeout(timer)
      }, [notice])

      React.useEffect(() => {
        if (confirming === null) return undefined
        const timer = setTimeout(() => setConfirming(null), 3000)
        return () => clearTimeout(timer)
      }, [confirming])

      const tasks = snapshot.tasks
      const counts = { all: tasks.length, todo: 0, doing: 0, done: 0 }
      for (const task of tasks) counts[task.status] = (counts[task.status] ?? 0) + 1
      const donePct = counts.all === 0 ? 0 : Math.round((counts.done / counts.all) * 100)

      const visible = tasks
        .filter((task) => filter === 'all' || task.status === filter)
        .sort((left, right) => {
          if (filter === 'done') return (right.completedAt ?? right.updatedAt) - (left.completedAt ?? left.updatedAt)
          return (STATUS_RANK[left.status] ?? 3) - (STATUS_RANK[right.status] ?? 3)
            || (PRIORITY_RANK[left.priority] ?? 1) - (PRIORITY_RANK[right.priority] ?? 1)
            || left.createdAt - right.createdAt
        })

      /** Run one panel mutation, then re-read the authoritative list. */
      const mutate = async (endpoint, payload) => {
        setPending(true)
        setError('')
        setNotice('')
        try {
          const value = await call(endpoint, payload)
          if (value?.ok === false) {
            setError(t('error.action', { message: String(value.reason ?? 'refused') }))
            return undefined
          }
          await refresh()
          return value
        } catch (failure) {
          setError(t('error.action', { message: messageOf(failure) }))
          return undefined
        } finally {
          setPending(false)
        }
      }

      const submit = async (event) => {
        event.preventDefault()
        const title = draft.trim()
        if (title.length === 0 || pending) return
        const value = await mutate('add', { title, priority })
        if (value !== undefined) {
          setDraft('')
          setFilter('all')
        }
      }

      const toggle = async (task) => {
        if (pending) return
        await mutate('setStatus', { id: task.id, status: task.status === 'done' ? 'todo' : 'done' })
      }

      const release = async (id) => {
        if (pending) return
        await mutate('release', { id })
      }

      const requestDelete = async (id) => {
        if (pending) return
        if (confirming !== id) {
          setConfirming(id)
          return
        }
        setConfirming(null)
        await mutate('remove', { id })
      }

      const clearDone = async () => {
        if (pending) return
        await mutate('clearDone', {})
      }

      const wakeAgents = async () => {
        setPending(true)
        setError('')
        setNotice('')
        try {
          const value = await call('wake', {})
          if (typeof value?.woken === 'string') {
            setNotice(t('wake.ok', { session: sessionLabel(sessions, value.woken) }))
          } else {
            setNotice(t('wake.none'))
          }
          await refresh()
        } catch (failure) {
          setError(t('error.action', { message: messageOf(failure) }))
        } finally {
          setPending(false)
        }
      }

      const row = (task) => {
        const open = expanded === task.id
        const running = typeof task.assignee === 'string' && sessions?.[task.assignee]?.running === true
        return h('li', {
          key: task.id,
          className: 'tdl-row',
          'data-done': task.status === 'done' ? 'true' : 'false',
          'data-doing': task.status === 'doing' ? 'true' : 'false',
        }, [
          h('button', {
            key: 'check',
            type: 'button',
            role: 'checkbox',
            'aria-checked': task.status === 'done',
            'aria-label': t('row.toggle'),
            className: 'tdl-check',
            disabled: pending,
            onClick: () => void toggle(task),
          }, task.status === 'done' ? IconCheck(11) : null),
          h('div', { key: 'main', className: 'tdl-rowMain' }, [
            h('div', { key: 'head', className: 'tdl-rowHead' }, [
              h('button', {
                key: 'title',
                type: 'button',
                className: 'tdl-title',
                'aria-expanded': open,
                title: t(open ? 'row.collapse' : 'row.expand'),
                onClick: () => setExpanded(open ? null : task.id),
              }, task.title),
              h('span', { key: 'badges', className: 'tdl-badges' }, [
                task.priority !== 'normal'
                  ? h('span', { key: 'prio', className: 'tdl-priority', 'data-level': task.priority }, t(PRIORITY_LABEL[task.priority] ?? 'priority.normal'))
                  : null,
                task.status === 'doing'
                  ? h('span', { key: 'doing', className: 'tdl-doing' }, [h('span', { key: 'dot', className: 'tdl-dot' }), t('status.doing')])
                  : null,
              ]),
            ]),
            h('div', { key: 'meta', className: 'tdl-meta' }, [
              typeof task.assignee === 'string' && task.assignee.length > 0
                ? h('button', {
                  key: 'owner',
                  type: 'button',
                  className: 'tdl-link',
                  title: t('row.openSession'),
                  onClick: () => openSession(task.assignee),
                }, IconUser(12), sessionLabel(sessions, task.assignee), running ? h('span', { key: 'live', className: 'tdl-dot' }) : null)
                : h('span', { key: 'owner', className: 'tdl-muted' }, t('row.unclaimed')),
              h('span', { key: 'sep', className: 'tdl-sep' }, '·'),
              h('time', {
                key: 'time',
                className: 'tdl-muted',
                dateTime: new Date(task.createdAt).toISOString(),
                title: new Date(task.createdAt).toLocaleString(),
              }, t('row.created', { time: timeLabel(task.createdAt) })),
            ]),
            open
              ? h('div', { key: 'detail', className: 'tdl-detail' }, [
                task.notes.length > 0
                  ? h('div', { key: 'notes' }, [h('div', { key: 'label', className: 'tdl-detailLabel' }, t('row.notes')), h('p', { key: 'text', className: 'tdl-pre' }, task.notes)])
                  : null,
                task.result.length > 0
                  ? h('div', { key: 'result' }, [h('div', { key: 'label', className: 'tdl-detailLabel' }, t('row.result')), h('p', { key: 'text', className: 'tdl-pre' }, task.result)])
                  : null,
                task.status === 'doing'
                  ? h('button', { key: 'release', type: 'button', className: 'tdl-small', onClick: () => void release(task.id), disabled: pending }, t('row.release'))
                  : null,
                task.notes.length === 0 && task.result.length === 0 && task.status !== 'doing'
                  ? h('p', { key: 'nothing', className: 'tdl-pre' }, t('row.unclaimed'))
                  : null,
              ])
              : null,
          ]),
          h('button', {
            key: 'delete',
            type: 'button',
            className: 'tdl-delete',
            'data-confirm': confirming === task.id ? 'true' : 'false',
            'aria-label': t('row.delete'),
            title: confirming === task.id ? t('row.confirmDelete') : t('row.delete'),
            disabled: pending,
            onClick: () => void requestDelete(task.id),
          }, confirming === task.id ? t('row.confirmDelete') : IconTrash(14)),
        ])
      }

      const banner = error.length > 0
        ? h('div', { key: 'error', className: 'tdl-banner', role: 'alert' }, [h('span', { key: 'text' }, error), h('button', { key: 'close', type: 'button', className: 'tdl-bannerClose', 'aria-label': 'dismiss', onClick: () => setError('') }, '×')])
        : notice.length > 0
          ? h('div', { key: 'notice', className: 'tdl-banner', 'data-kind': 'notice' }, [h('span', { key: 'text' }, notice), h('button', { key: 'close', type: 'button', className: 'tdl-bannerClose', 'aria-label': 'dismiss', onClick: () => setNotice('') }, '×')])
          : null

      return h('div', { className: 'tdl-page' },
        h('div', { className: 'tdl-scroll' },
          h('div', { className: 'tdl-content' }, [
            h('header', { key: 'head', className: 'tdl-head' }, [
              h('div', { key: 'text', className: 'tdl-headText' }, [
                h('h1', { key: 'title' }, t('panel')),
                h('p', { key: 'intro', className: 'tdl-intro' }, t('intro')),
              ]),
              h('div', { key: 'actions', className: 'tdl-headActions' }, [
                h('button', {
                  key: 'wake',
                  type: 'button',
                  className: 'tdl-ghost',
                  title: t('action.wakeHint'),
                  disabled: pending || counts.todo === 0,
                  onClick: () => void wakeAgents(),
                }, [IconSpark(14), t('action.wake')]),
                h('button', {
                  key: 'clear',
                  type: 'button',
                  className: 'tdl-ghost',
                  disabled: pending || counts.done === 0,
                  onClick: () => void clearDone(),
                }, [IconList(14), t('action.clearDone')]),
              ]),
            ]),
            h('div', { key: 'summary', className: 'tdl-summary' }, [
              h('span', { key: 'text', className: 'tdl-summaryText' }, t('summary', counts)),
              h('div', {
                key: 'bar',
                className: 'tdl-progress',
                role: 'progressbar',
                'aria-valuenow': donePct,
                'aria-valuemin': 0,
                'aria-valuemax': 100,
              }, h('div', { className: 'tdl-progressFill', style: { width: `${donePct}%` } })),
            ]),
            h('form', { key: 'add', className: 'tdl-add', onSubmit: (event) => void submit(event) }, [
              h('span', { key: 'icon', className: 'tdl-addIcon' }, IconPlus(16)),
              h('input', {
                key: 'input',
                value: draft,
                maxLength: 300,
                placeholder: t('add.placeholder'),
                'aria-label': t('add.placeholder'),
                disabled: pending,
                onChange: (event) => setDraft(event.target.value),
              }),
              h('select', {
                key: 'priority',
                className: 'tdl-prioritySelect',
                value: priority,
                'aria-label': t('add.priority'),
                disabled: pending,
                onChange: (event) => setPriority(event.target.value),
              }, ['high', 'normal', 'low'].map((level) => h('option', { key: level, value: level }, t(PRIORITY_LABEL[level])))),
              h('button', {
                key: 'submit',
                type: 'submit',
                className: 'tdl-addButton',
                disabled: pending || draft.trim().length === 0,
              }, t('add.submit')),
            ]),
            h('div', { key: 'filters', className: 'tdl-filters', role: 'tablist' }, FILTERS.map(([id, key]) => h('button', {
              key: id,
              type: 'button',
              role: 'tab',
              className: 'tdl-tab',
              'aria-selected': filter === id,
              'data-active': filter === id ? 'true' : 'false',
              onClick: () => setFilter(id),
            }, [t(key), h('span', { key: 'count', className: 'tdl-count' }, String(counts[id] ?? 0))]))),
            banner,
            visible.length === 0
              ? h('div', { key: 'empty', className: 'tdl-empty' }, [
                h('span', { key: 'icon', className: 'tdl-emptyIcon' }, IconEmpty(28)),
                h('p', { key: 'title', className: 'tdl-emptyTitle' }, t(filter === 'all' ? 'empty.title' : 'empty.filterTitle')),
                h('p', { key: 'hint', className: 'tdl-emptyHint' }, t(filter === 'all' ? 'empty.hint' : 'empty.filterHint')),
              ])
              : h('ul', { key: 'rows', className: 'tdl-rows' }, visible.map(row)),
          ]),
        ),
      )
    }

    /** Client plugin body. */
    return {
      inject: ['locale', 'slots', 'uiWorkspace'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, 'zh', zh), 'todolist: zh copy')
        ctx.effect(() => ctx.locale.register(NS, 'en', en), 'todolist: en copy')

        const tag = document.createElement('style')
        tag.dataset.plugin = '@tanlinfeng/dsh-todolist'
        tag.textContent = CSS
        ctx.effect(() => {
          document.head.appendChild(tag)
          return () => tag.remove()
        }, 'todolist: styles')

        /** One Host call over the plugin's own authenticated Fetch route. */
        const call = async (endpoint, payload, signal) => {
          const response = await globalThis.fetch(ROUTE, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ endpoint, payload: payload ?? {} }),
            ...(signal === undefined ? {} : { signal }),
          })
          if (!response.ok) throw new Error(`TodoList request failed (HTTP ${response.status})`)
          const result = await response.json()
          if (!result || result.ok !== true) {
            const error = new Error(result?.error?.message ?? 'TodoList request failed')
            error.code = result?.error?.code
            throw error
          }
          return result.value
        }

        const openSession = (sessionId) => {
          try {
            ctx.uiWorkspace.openSession(sessionId)
          } catch (failure) {
            console.warn('todolist: cannot open session', failure)
          }
        }

        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
          locale: NS,
          inject: () => ({ call, openSession }),
        }, TodoPanel))

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 20,
          locale: NS,
          label: () => ctx.locale.bind(NS)('panel'),
        }, PanelIcon))
      },
    }
  },
})
