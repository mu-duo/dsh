/**
 * Iteration mode: auto-enter plan mode for new sessions of the `iterate` preset.
 *
 * The preset mounts this row next to `dsh-plan-mode` inside the `planning`
 * isolation group, so the realm-private `planMode` service is reachable here
 * and nowhere else. A fresh or cleared session starts in plan mode, which is
 * the human gate of this mode: the agent grills the requirements and submits a
 * plan through `exit_plan_mode`, and the user's review decides whether
 * implementation begins. Resumed and compacted sessions keep the logged state,
 * so an approved plan is never re-opened by a restart.
 *
 * @module @tanlinfeng/dsh-iteration-mode
 */

/** Cordis plugin name. */
export const name = 'iteration-plan-gate'

/** The plan controller this row selects the initial state on. */
export const inject = ['planMode']

/**
 * Enter plan mode when a new session is created under this preset.
 *
 * `startup` is a brand-new session and `clear` is the user starting a new task
 * in the same session; both begin unaligned, so both get the interview. A
 * `resume` or `compact` keeps whatever the log already recorded.
 *
 * @param ctx - the preset-scoped context owning the plan realm.
 */
export function apply(ctx) {
  ctx.on('agent/created', ({ agent, source }) => {
    if (source !== 'startup' && source !== 'clear') return
    ctx.planMode.set(agent, true)
  })
}
