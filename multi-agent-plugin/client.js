window.__ModuleLoader__.load({
  id: '@tanlinfeng/dsh-multi-agent',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'multi-agent'
    const ID = '@tanlinfeng/dsh-multi-agent'
    const KIND = 'multi-agent'
    const ROUTE = '/api/multi-agent'
    const POLL_MS = 2000
    const EFFORTS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']

    const zh = {
      title: '多智能体',
      subtitle: '角色编排与运行状态',
      'guide.title': '多智能体',
      'guide.description': '查看角色与子智能体运行状态',
      'command.label': '多智能体',
      'command.description': '打开多智能体面板：角色、并行占用与运行状态',
      summary: '{running} 个运行中 · {total} 个子智能体',
      'role.generic': '通用子智能体',
      'model.inherit': '继承父模型',
      'effort.follow': '模型默认',
      'status.running': '运行中',
      'status.completed': '已完成',
      'status.cancelled': '已取消',
      'status.failed': '失败',
      'status.idle': '未运行',
      'action.stop': '停止',
      'action.stopTitle': '停止该子智能体的当前回合',
      'action.openAside': '在右栏打开',
      'action.refresh': '刷新',
      'empty.title': '还没有子智能体',
      'empty.body': '主 agent 调用 delegate 后，角色与运行状态会出现在这里。',
      'empty.hint': '角色可以在 Plugins → 多智能体 页面配置。',
      'error.title': '无法读取子智能体',
      retry: '重试',
      'notice.stopped': '已请求停止 {id}',
      'notice.stopFailed': '停止失败：{message}',
      'diagnostic': '有 {count} 个子会话无法读取',
      'settings.summary': '{count} 个角色 · 配置模型、推理等级与并行上限',
      'settings.summaryShort': '角色、模型、推理等级与并行上限',
      'settings.title': '子智能体角色',
      'settings.intro': '角色决定派生子智能体时使用的模型、推理等级与并行上限；名称与描述会进入主 agent 的工具说明。',
      'settings.add': '新增角色',
      'settings.newRole': '新角色',
      'settings.builtin': '内置',
      'settings.custom': '自定义',
      'settings.name': '名称',
      'settings.description': '描述',
      'settings.model': '模型',
      'settings.effort': '推理等级',
      'settings.parallel': '并行上限',
      'settings.readOnly': '只读',
      'settings.readOnlyHint': '只读约束会写入子智能体提示词',
      'settings.instructions': '附加指令',
      'settings.instructionsHint': '追加到该角色子智能体的任务提示之前。',
      'settings.instructionsPlaceholder': '例如：优先使用 rg；不要修改测试夹具。',
      'settings.save': '保存',
      'settings.saving': '保存中…',
      'settings.cancel': '取消',
      'settings.delete': '删除',
      'settings.deleteConfirm': '再次点击删除',
      'settings.reset': '恢复默认内置角色',
      'settings.resetConfirm': '确认恢复？',
      'settings.inherit': '继承父 agent',
      'settings.followDefault': '跟随模型默认',
      'settings.noReasoning': '该模型不提供推理等级',
      'settings.catalogLoading': '正在读取模型目录…',
      'settings.loading': '正在读取角色…',
      'panel.loading': '正在读取子智能体…',
      'settings.catalogError': '模型目录不可用，可手动填写 provider 与 model',
      'settings.provider': 'Provider',
      'settings.modelId': 'Model',
      'settings.saved': '已保存',
      'settings.added': '已新增角色',
      'settings.deleted': '已删除',
      'settings.resetDone': '已恢复默认内置角色',
      'settings.error': '保存失败：{message}',
      'settings.loadError': '无法读取角色：{message}',
      'settings.empty': '尚未配置角色',
      'settings.deleteBuiltin': '内置角色不能删除',
      'settings.parallelHint': '每个父会话 × 该角色独立计数',
      'settings.persistHint': '保存在 $DSH_HOME/multi-agent/roles.json，下一次委派时生效。',
      'settings.namePlaceholder': '例如：Reviewer',
      'settings.descriptionPlaceholder': '一句话说明这个角色做什么',
      'settings.idLabel': 'id',
    }

    const en = {
      title: 'Multi-agent',
      subtitle: 'Role orchestration and run status',
      'guide.title': 'Multi-agent',
      'guide.description': 'Roles and subagent run status',
      'command.label': 'Multi-agent',
      'command.description': 'Open the multi-agent panel: roles, parallel usage, and run status',
      summary: '{running} running · {total} subagents',
      'role.generic': 'Generic subagent',
      'model.inherit': 'Inherits parent model',
      'effort.follow': 'Model default',
      'status.running': 'Running',
      'status.completed': 'Completed',
      'status.cancelled': 'Cancelled',
      'status.failed': 'Failed',
      'status.idle': 'Inactive',
      'action.stop': 'Stop',
      'action.stopTitle': 'Stop this subagent’s current turn',
      'action.openAside': 'Open in the right Sidebar',
      'action.refresh': 'Refresh',
      'empty.title': 'No subagents yet',
      'empty.body': 'Once the main agent calls delegate, roles and run status appear here.',
      'empty.hint': 'Configure roles on the Plugins → Multi-agent page.',
      'error.title': 'Cannot read subagents',
      retry: 'Retry',
      'notice.stopped': 'Requested stop for {id}',
      'notice.stopFailed': 'Stop failed: {message}',
      'diagnostic': '{count} child session(s) could not be read',
      'settings.summary': '{count} roles · models, reasoning, and parallel limits',
      'settings.summaryShort': 'Roles, models, reasoning, and parallel limits',
      'settings.title': 'Subagent roles',
      'settings.intro': 'A role decides the model, reasoning effort, and parallel limit used when a subagent is delegated. Its name and description reach the main agent’s tool description.',
      'settings.add': 'Add role',
      'settings.newRole': 'New role',
      'settings.builtin': 'Built-in',
      'settings.custom': 'Custom',
      'settings.name': 'Name',
      'settings.description': 'Description',
      'settings.model': 'Model',
      'settings.effort': 'Reasoning effort',
      'settings.parallel': 'Parallel limit',
      'settings.readOnly': 'Read-only',
      'settings.readOnlyHint': 'The read-only constraint is written into the child prompt',
      'settings.instructions': 'Extra instructions',
      'settings.instructionsHint': 'Prepended to the task prompt of this role’s subagents.',
      'settings.instructionsPlaceholder': 'For example: prefer rg; do not modify test fixtures.',
      'settings.save': 'Save',
      'settings.saving': 'Saving…',
      'settings.cancel': 'Cancel',
      'settings.delete': 'Delete',
      'settings.deleteConfirm': 'Click again to delete',
      'settings.reset': 'Restore built-in defaults',
      'settings.resetConfirm': 'Restore defaults?',
      'settings.inherit': 'Inherit parent agent',
      'settings.followDefault': 'Follow model default',
      'settings.noReasoning': 'This model offers no reasoning effort',
      'settings.catalogLoading': 'Loading model catalog…',
      'settings.loading': 'Loading roles…',
      'panel.loading': 'Loading subagents…',
      'settings.catalogError': 'Model catalog unavailable; enter provider and model manually',
      'settings.provider': 'Provider',
      'settings.modelId': 'Model',
      'settings.saved': 'Saved',
      'settings.added': 'Role added',
      'settings.deleted': 'Deleted',
      'settings.resetDone': 'Built-in roles restored',
      'settings.error': 'Save failed: {message}',
      'settings.loadError': 'Cannot read roles: {message}',
      'settings.empty': 'No roles configured',
      'settings.deleteBuiltin': 'Built-in roles cannot be deleted',
      'settings.parallelHint': 'Counted per parent session and role',
      'settings.persistHint': 'Stored in $DSH_HOME/multi-agent/roles.json; applies to the next delegation.',
      'settings.namePlaceholder': 'For example: Reviewer',
      'settings.descriptionPlaceholder': 'One sentence on what this role does',
      'settings.idLabel': 'id',
    }

    const CSS = `
.ma-page{box-sizing:border-box;width:100%;height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13.5px;line-height:1.6}
.ma-head{flex:none;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:13px 16px 9px;border-bottom:.5px solid var(--dsw-alias-border-l1,var(--dsw-alias-border-l2))}
.ma-headText{min-width:0}
.ma-headText h1{margin:0;font-size:15px;font-weight:600;line-height:22px}
.ma-headText p{margin:2px 0 0;color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:17px}
.ma-headActions{display:flex;align-items:center;gap:4px;flex:none}
.ma-iconBtn{display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:26px;padding:0 7px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;cursor:pointer;white-space:nowrap}
.ma-iconBtn:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent);color:var(--dsw-alias-label-primary)}
.ma-iconBtn:disabled{opacity:.45;cursor:default}
.ma-summary{flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:9px 16px 3px}
.ma-chip{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border:.5px solid var(--dsw-alias-border-l1,var(--dsw-alias-border-l2));border-radius:11px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1;white-space:nowrap}
.ma-chip[data-active=true]{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 9%,transparent);color:var(--dsw-alias-label-primary)}
.ma-chip--total{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.ma-chipDot{width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-state-idle-primary,var(--dsw-alias-label-secondary));flex:none}
.ma-chip[data-active=true] .ma-chipDot{background:var(--dsw-alias-brand-primary);animation:ma-pulse 1.4s ease-in-out infinite}
.ma-scroll{flex:1;min-height:0;overflow:auto;scrollbar-gutter:stable}
.ma-content{box-sizing:border-box;width:100%;padding:8px 16px 22px}
.ma-list{display:flex;flex-direction:column;gap:3px}
.ma-row{display:flex;align-items:center;gap:8px;min-width:0;padding:7px 8px;border-radius:9px;cursor:pointer;outline:none}
.ma-row:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent)}
.ma-row:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px}
.ma-row[data-status=running]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 4%,transparent)}
.ma-status{width:14px;height:14px;flex:none;display:inline-flex;align-items:center;justify-content:center}
.ma-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-idle-primary,var(--dsw-alias-label-secondary))}
.ma-status--success .ma-dot{background:var(--dsw-alias-state-success-primary,var(--dsw-alias-brand-primary))}
.ma-status--warn .ma-dot{background:var(--dsw-alias-state-warn-primary)}
.ma-status--error .ma-dot{background:var(--dsw-alias-state-error-primary)}
.ma-spinner{width:10px;height:10px;border:1.5px solid color-mix(in srgb,var(--dsw-alias-label-primary) 18%,transparent);border-top-color:var(--dsw-alias-brand-primary);border-radius:50%;animation:ma-spin .8s linear infinite}
.ma-rowMain{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.ma-rowHead{display:flex;align-items:center;gap:6px;min-width:0}
.ma-roleBadge{flex:none;max-width:42%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 6px;border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10.5px;line-height:17px}
.ma-roleBadge[data-running=true]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);color:var(--dsw-alias-label-primary)}
.ma-rowLabel{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font-size:12.5px;line-height:19px}
.ma-rowMeta{display:flex;align-items:center;gap:7px;min-width:0;overflow:hidden;color:var(--dsw-alias-label-secondary);font-size:10.5px;line-height:15px;white-space:nowrap;text-overflow:ellipsis}
.ma-rowMeta span{overflow:hidden;text-overflow:ellipsis}
.ma-rowActions{flex:none;display:flex;align-items:center;gap:2px;opacity:0;transition:opacity .12s}
.ma-row[data-status=running] .ma-rowActions,.ma-row:hover .ma-rowActions,.ma-row:focus-within .ma-rowActions{opacity:1}
@media (hover:none){.ma-rowActions{opacity:1}}
.ma-rowActions button{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;padding:0 6px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:10.5px;cursor:pointer}
.ma-rowActions button:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent);color:var(--dsw-alias-label-primary)}
.ma-rowActions button[data-stop]{color:var(--dsw-alias-state-warn-primary)}
.ma-empty{padding:26px 4px;display:flex;flex-direction:column;gap:7px;align-items:flex-start}
.ma-emptyIcon{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:13px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent);color:var(--dsw-alias-brand-primary)}
.ma-emptyTitle{margin:2px 0 0;font-size:15px;font-weight:600;line-height:22px}
.ma-emptyBody{margin:0;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:19px;max-width:520px}
.ma-emptyHint{margin:0;color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:17px}
.ma-errorBanner{display:flex;align-items:flex-start;gap:8px;margin:8px 0 4px;padding:8px 10px;border-radius:9px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 9%,transparent);color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}
.ma-errorBanner button{margin-left:auto;flex:none;border:.5px solid currentColor;border-radius:7px;background:transparent;color:inherit;font:inherit;font-size:11px;padding:0 7px;line-height:18px;cursor:pointer}
.ma-notice{margin:4px 0;color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:17px}
.ma-notice[data-error=true]{color:var(--dsw-alias-state-error-primary)}
.ma-tabTitle{display:inline-flex;align-items:center;gap:6px;min-width:0}
.ma-tabTitle span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ma-settings{box-sizing:border-box;width:100%;display:flex;flex-direction:column;gap:14px;padding:4px 0 8px;color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.6}
.ma-settingsHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
.ma-settingsHead h2{margin:0;font-size:15px;font-weight:600;line-height:22px}
.ma-settingsHead p{margin:3px 0 0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;max-width:640px}
.ma-settingsActions{display:flex;align-items:center;gap:8px;flex:none;flex-wrap:wrap}
.ma-btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;height:28px;padding:0 11px;border:.5px solid var(--dsw-alias-border-l1,var(--dsw-alias-border-l2));border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:1;cursor:pointer;white-space:nowrap}
.ma-btn:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.ma-btn:disabled{opacity:.45;cursor:default}
.ma-btn--primary{background:var(--dsw-alias-brand-primary);border-color:transparent;color:var(--dsw-alias-bg-base)}
.ma-btn--primary:hover:not(:disabled){background:var(--dsw-alias-brand-primary);filter:brightness(1.06)}
.ma-btn--danger{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 30%,transparent)}
.ma-btn--ghost{background:transparent;border-color:transparent;color:var(--dsw-alias-label-secondary)}
.ma-btn--ghost:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.ma-roleCard{border:.5px solid var(--dsw-alias-border-l1,var(--dsw-alias-border-l2));border-radius:11px;background:var(--dsw-alias-bg-layer-1);padding:11px 13px;display:flex;flex-direction:column;gap:9px}
.ma-roleCard[data-new=true]{border-style:dashed}
.ma-cardHead{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ma-cardTitle{flex:1;min-width:160px;display:flex;align-items:center;gap:8px}
.ma-input{box-sizing:border-box;width:100%;border:.5px solid var(--dsw-alias-border-l1,var(--dsw-alias-border-l2));border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;line-height:18px;padding:5px 9px;outline:none}
.ma-input:focus{border-color:var(--dsw-alias-brand-primary)}
.ma-input::placeholder{color:var(--dsw-alias-label-secondary)}
textarea.ma-input{resize:vertical;min-height:44px}
select.ma-input{height:30px;padding:0 8px}
.ma-cardTitle .ma-input{font-size:13.5px;font-weight:500}
.ma-badge{flex:none;padding:0 6px;border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10px;line-height:17px}
.ma-badge--builtin{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent);color:var(--dsw-alias-label-primary)}
.ma-code{color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10.5px}
.ma-fieldGrid{display:flex;flex-wrap:wrap;gap:9px}
.ma-field{flex:1 1 150px;min-width:120px;display:flex;flex-direction:column;gap:3px}
.ma-field--wide{flex:2 1 260px}
.ma-field--small{flex:0 1 110px;min-width:100px}
.ma-field label{color:var(--dsw-alias-label-secondary);font-size:11px;line-height:15px}
.ma-hint{color:var(--dsw-alias-label-secondary);font-size:10.5px;line-height:15px}
.ma-hint[data-error=true]{color:var(--dsw-alias-state-error-primary)}
.ma-switchRow{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.ma-switch{display:inline-flex;align-items:center;gap:7px;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer;padding:0}
.ma-switchTrack{width:28px;height:16px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l1,var(--dsw-alias-border-l2));position:relative;transition:background .14s;flex:none}
.ma-switchTrack::after{content:"";position:absolute;top:2px;left:2px;width:10px;height:10px;border-radius:50%;background:var(--dsw-alias-label-secondary);transition:transform .14s,background .14s}
.ma-switch[aria-checked=true] .ma-switchTrack{background:var(--dsw-alias-brand-primary);border-color:transparent}
.ma-switch[aria-checked=true] .ma-switchTrack::after{transform:translateX(12px);background:var(--dsw-alias-bg-base)}
.ma-cardFoot{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ma-cardFoot .ma-spacer{flex:1}
.ma-cardFoot .ma-hint{flex:1;min-width:160px}
.ma-details summary{cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:18px;list-style:none}
.ma-details summary::-webkit-details-marker{display:none}
.ma-details summary::before{content:"›";display:inline-block;margin-right:5px;transition:transform .12s}
.ma-details[open] summary::before{transform:rotate(90deg)}
.ma-detailsBody{margin-top:6px}
.ma-settingsFoot{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding-top:2px}
.ma-settingsNote{margin:0;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:17px}
.ma-loading{padding:10px 2px;color:var(--dsw-alias-label-secondary);font-size:12px}
.ma-bundleSummary{color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:19px}
@media (prefers-reduced-motion:reduce){.ma-spinner,.ma-chipDot{animation:none}}
@keyframes ma-spin{to{transform:rotate(360deg)}}
@keyframes ma-pulse{0%,100%{opacity:.35}50%{opacity:1}}
`

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
        strokeWidth: width ?? 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      })))
    }

    /** The bundle's mark: one orchestrator with three role nodes. */
    function PanelIcon(sizeOrProps) {
      const size = typeof sizeOrProps === 'number' ? sizeOrProps : sizeOrProps?.size ?? 20
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 20 20',
        fill: 'none',
        'aria-hidden': true,
        style: { display: 'block' },
      }, [
        h('circle', { key: 'core', cx: 10, cy: 10, r: 2.6, stroke: 'currentColor', strokeWidth: 1.5 }),
        h('circle', { key: 'a', cx: 4.6, cy: 5.6, r: 1.6, stroke: 'currentColor', strokeWidth: 1.3 }),
        h('circle', { key: 'b', cx: 15.4, cy: 5.6, r: 1.6, stroke: 'currentColor', strokeWidth: 1.3 }),
        h('circle', { key: 'c', cx: 10, cy: 15.6, r: 1.6, stroke: 'currentColor', strokeWidth: 1.3 }),
        h('path', { key: 'l1', d: 'M5.8 6.7 8.1 8.6M14.2 6.7 11.9 8.6M10 12.6v1.5', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round' }),
      ])
    }

    function IconStop(size) {
      return strokes(size ?? 12, ['M5 5h10v10H5z'], 1.5)
    }

    function IconAside(size) {
      return strokes(size ?? 13, ['M4 5.5h7.5V11', 'M11.5 5.5 4.8 12.2', 'M8.5 15.5h7v-7'], 1.4)
    }

    function IconRefresh(size) {
      return strokes(size ?? 13, ['M15.5 8a6 6 0 1 0 .4 4', 'M15.6 4.5V8h-3.4'], 1.4)
    }

    function IconPlus(size) {
      return strokes(size ?? 13, ['M10 4.5v11', 'M4.5 10h11'], 1.5)
    }

    /** Inline formatting used by locale strings. */
    function format(template, values) {
      return String(template).replace(/\{(\w+)\}/g, (match, key) => (values[key] === undefined ? match : String(values[key])))
    }

    /** Shorten a session id for display. */
    function shortId(id) {
      const raw = String(id ?? '')
      return raw.startsWith('session-') ? raw.slice('session-'.length, 'session-'.length + 8) : raw.slice(0, 8)
    }

    /** One duration in a compact human form. */
    function duration(ms) {
      const total = Math.max(0, Math.round(ms / 1000))
      if (total < 60) return `${total}s`
      const minutes = Math.floor(total / 60)
      if (minutes < 60) return `${minutes}m ${total % 60}s`
      const hours = Math.floor(minutes / 60)
      return `${hours}h ${minutes % 60}m`
    }

    /** Localized status text. */
    function statusLabel(t, status) {
      if (status === 'running' || status === 'completed' || status === 'cancelled' || status === 'failed') return t(`status.${status}`)
      return t('status.idle')
    }

    /** One status glyph; only genuinely running children animate. */
    function StatusGlyph({ status }) {
      if (status === 'running') return h('span', { className: 'ma-status' }, h('span', { className: 'ma-spinner' }))
      const tone = status === 'completed' ? 'success' : status === 'failed' ? 'error' : status === 'cancelled' ? 'warn' : 'idle'
      return h('span', { className: `ma-status ma-status--${tone}` }, h('span', { className: 'ma-dot' }))
    }

    /** Right-Sidebar roster over one session's descendant subagents. */
    function RosterPanel(props) {
      const t = props.t
      const sessionId = props.sessionId
      const call = props.call
      const openChild = props.openChild
      const openAside = props.openAside
      const [snapshot, setSnapshot] = React.useState({ status: 'loading', value: null, error: '' })
      const [stopping, setStopping] = React.useState(null)
      const [notice, setNotice] = React.useState('')
      const [noticeError, setNoticeError] = React.useState(false)
      const [clock, setClock] = React.useState(Date.now())
      const sequence = React.useRef(0)

      const load = React.useCallback(async (signal) => {
        const ticket = sequence.current + 1
        sequence.current = ticket
        try {
          const value = await call('runs.list', { parentSessionId: sessionId }, signal)
          if (sequence.current !== ticket) return
          setSnapshot({ status: 'ready', value, error: '' })
        } catch (failure) {
          if (signal?.aborted) return
          if (sequence.current !== ticket) return
          setSnapshot((previous) => ({ status: previous.value === null ? 'error' : 'ready', value: previous.value, error: failure instanceof Error ? failure.message : String(failure) }))
        }
      }, [call, sessionId])

      React.useEffect(() => {
        const controller = new AbortController()
        void load(controller.signal)
        const timer = setInterval(() => {
          if (!document.hidden) void load(controller.signal)
        }, POLL_MS)
        const onVisibility = () => {
          if (!document.hidden) void load(controller.signal)
        }
        document.addEventListener('visibilitychange', onVisibility)
        return () => {
          controller.abort()
          clearInterval(timer)
          document.removeEventListener('visibilitychange', onVisibility)
        }
      }, [load])

      React.useEffect(() => {
        const timer = setInterval(() => setClock(Date.now()), 1000)
        return () => clearInterval(timer)
      }, [])

      const rows = snapshot.value?.rows ?? []
      const roles = snapshot.value?.roles ?? []
      const summary = snapshot.value?.summary ?? { running: 0, total: rows.length }
      const diagnostics = snapshot.value?.diagnostics ?? []
      const failure = snapshot.value?.failure ?? ''

      const stop = async (row) => {
        setStopping(row.id)
        setNotice('')
        try {
          await call('runs.stop', { parentSessionId: sessionId, childId: row.id })
          setNoticeError(false)
          setNotice(format(t('notice.stopped'), { id: shortId(row.id) }))
          await load()
        } catch (error) {
          setNoticeError(true)
          setNotice(format(t('notice.stopFailed'), { message: error instanceof Error ? error.message : String(error) }))
        } finally {
          setStopping(null)
        }
      }

      const row = (entry) => {
        const running = entry.status === 'running'
        const elapsed = entry.settledAt !== null && entry.startedAt !== null
          ? entry.settledAt - entry.startedAt
          : entry.startedAt !== null ? clock - entry.startedAt : null
        const meta = []
        if (entry.provider !== null && entry.model !== null) meta.push(`${entry.provider}/${entry.model}`)
        else meta.push(t('model.inherit'))
        if (entry.reasoningEffort !== null) meta.push(entry.reasoningEffort)
        if (elapsed !== null) meta.push(duration(elapsed))
        if (entry.depth > 1) meta.push(`↳ ${shortId(entry.parentId)}`)
        if (entry.stopReason !== null && entry.status !== 'completed' && entry.status !== 'running') meta.push(entry.stopReason)
        const local = entry.mode !== 'external'
        return h('div', {
          key: entry.id,
          className: 'ma-row',
          'data-status': entry.status,
          role: 'button',
          tabIndex: local ? 0 : -1,
          title: entry.label,
          'aria-label': `${entry.roleName ?? t('role.generic')} · ${statusLabel(t, entry.status)} · ${entry.label}`,
          onClick: () => {
            if (local) openChild(entry.id)
          },
          onKeyDown: (event) => {
            if (!local) return
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              openChild(entry.id)
            }
          },
          style: { marginLeft: `${Math.min(6, Math.max(0, entry.depth - 1)) * 14}px` },
        }, [
          h(StatusGlyph, { key: 'status', status: entry.status }),
          h('div', { key: 'main', className: 'ma-rowMain' }, [
            h('div', { key: 'head', className: 'ma-rowHead' }, [
              h('span', { key: 'role', className: 'ma-roleBadge', 'data-running': running }, entry.roleName ?? t('role.generic')),
              h('span', { key: 'label', className: 'ma-rowLabel' }, entry.label),
            ]),
            h('div', { key: 'meta', className: 'ma-rowMeta' }, meta.map((part, index) => h('span', { key: index }, part))),
          ]),
          h('div', { key: 'actions', className: 'ma-rowActions' }, [
            running
              ? h('button', {
                key: 'stop',
                type: 'button',
                'data-stop': true,
                title: t('action.stopTitle'),
                'aria-label': t('action.stopTitle'),
                disabled: stopping === entry.id,
                onClick: (event) => {
                  event.stopPropagation()
                  void stop(entry)
                },
              }, IconStop(11))
              : null,
            local
              ? h('button', {
                key: 'aside',
                type: 'button',
                title: t('action.openAside'),
                'aria-label': t('action.openAside'),
                onClick: (event) => {
                  event.stopPropagation()
                  openAside(entry)
                },
              }, IconAside(12))
              : null,
          ]),
        ])
      }

      const body = []
      if (snapshot.status === 'loading' && snapshot.value === null) {
        body.push(h('div', { key: 'loading', className: 'ma-loading' }, t('panel.loading')))
      }
      if (snapshot.error.length > 0 || failure.length > 0) {
        body.push(h('div', { key: 'error', className: 'ma-errorBanner', role: 'alert' }, [
          h('span', { key: 'text' }, snapshot.error.length > 0 ? snapshot.error : failure),
          h('button', { key: 'retry', type: 'button', onClick: () => void load() }, t('retry')),
        ]))
      }
      if (diagnostics.length > 0) {
        body.push(h('div', { key: 'diag', className: 'ma-notice' }, format(t('diagnostic'), { count: diagnostics.length })))
      }
      if (snapshot.value !== null && rows.length === 0) {
        body.push(h('div', { key: 'empty', className: 'ma-empty' }, [
          h('span', { key: 'icon', className: 'ma-emptyIcon' }, PanelIcon(24)),
          h('p', { key: 'title', className: 'ma-emptyTitle' }, t('empty.title')),
          h('p', { key: 'body', className: 'ma-emptyBody' }, t('empty.body')),
          h('p', { key: 'hint', className: 'ma-emptyHint' }, t('empty.hint')),
        ]))
      }
      if (rows.length > 0) body.push(h('div', { key: 'list', className: 'ma-list' }, rows.map(row)))

      return h('div', { className: 'ma-page' }, [
        h('div', { key: 'head', className: 'ma-head' }, [
          h('div', { key: 'text', className: 'ma-headText' }, [
            h('h1', { key: 'title' }, t('title')),
            h('p', { key: 'subtitle' }, t('subtitle')),
          ]),
          h('div', { key: 'actions', className: 'ma-headActions' }, [
            h('button', {
              key: 'refresh',
              type: 'button',
              className: 'ma-iconBtn',
              title: t('action.refresh'),
              'aria-label': t('action.refresh'),
              onClick: () => void load(),
            }, IconRefresh(13)),
          ]),
        ]),
        h('div', { key: 'summary', className: 'ma-summary' }, [
          h('span', { key: 'total', className: 'ma-chip ma-chip--total' }, [
            h('span', { key: 'dot', className: 'ma-chipDot' }),
            format(t('summary'), { running: summary.running, total: summary.total }),
          ]),
          ...roles.map((role) => {
            const used = rows.filter((entry) => entry.parentId === sessionId && entry.roleId === role.id && entry.status === 'running').length
            const total = rows.filter((entry) => entry.roleId === role.id).length
            return h('span', {
              key: role.id,
              className: 'ma-chip',
              'data-active': used > 0,
              title: role.description,
            }, `${role.name} ${used}/${role.maxParallel}${total > used ? ` · ${total}` : ''}`)
          }),
        ]),
        h('div', { key: 'scroll', className: 'ma-scroll' }, h('div', { className: 'ma-content' }, [
          notice.length > 0 ? h('p', { key: 'notice', className: 'ma-notice', 'data-error': noticeError }, notice) : null,
          ...body,
        ])),
      ])
    }

    /** Chip title used by the right-Sidebar tab. */
    function RosterTitle(props) {
      return h('span', { className: 'ma-tabTitle' }, [
        h('span', { key: 'icon' }, PanelIcon(14)),
        h('span', { key: 'label' }, props.t('title')),
      ])
    }

    /** Model groups as `<optgroup>` options. */
    function modelGroups(catalog) {
      return (catalog?.groups ?? []).map((group) => ({
        id: group.id,
        name: group.name,
        models: group.models.map((model) => ({ id: model.id, name: model.name, reasoning: model.reasoning })),
      }))
    }

    /** Selectable effort options for one draft. */
    function effortChoices(catalog, draft) {
      if (draft.provider === null || draft.model === null) return EFFORTS.map((id) => ({ id, name: id }))
      for (const group of catalog?.groups ?? []) {
        if (group.id !== draft.provider) continue
        for (const model of group.models) {
          if (model.id !== draft.model) continue
          return (model.reasoning?.efforts ?? []).map((effort) => ({ id: effort.id, name: effort.name ?? effort.id }))
        }
      }
      return EFFORTS.map((id) => ({ id, name: id }))
    }

    /** One editable role card. */
    function RoleEditor({ t, role, catalog, busy, onPatch, onSave, onDelete, onCancel }) {
      const draft = role
      const efforts = effortChoices(catalog, draft)
      const isNew = draft.id === ''
      const modelValue = draft.provider !== null && draft.model !== null ? JSON.stringify([draft.provider, draft.model]) : ''
      const groups = modelGroups(catalog)
      const catalogReady = catalog?.status === 'ready'
      const modelField = catalogReady
        ? h('select', {
          className: 'ma-input',
          value: modelValue,
          onChange: (event) => {
            const raw = event.target.value
            if (raw.length === 0) onPatch({ provider: null, model: null, reasoningEffort: draft.reasoningEffort })
            else {
              const [provider, model] = JSON.parse(raw)
              onPatch({ provider, model, reasoningEffort: null })
            }
          },
        }, [
          h('option', { key: 'inherit', value: '' }, t('settings.inherit')),
          ...groups.map((group) => h('optgroup', { key: group.id, label: group.name },
            group.models.map((model) => h('option', { key: `${group.id}/${model.id}`, value: JSON.stringify([group.id, model.id]) }, model.name)))),
        ])
        : h('div', { className: 'ma-fieldGrid' }, [
          h('input', {
            key: 'provider',
            className: 'ma-input',
            value: draft.provider ?? '',
            placeholder: t('settings.provider'),
            onChange: (event) => onPatch({ provider: event.target.value.length > 0 ? event.target.value : null }),
          }),
          h('input', {
            key: 'model',
            className: 'ma-input',
            value: draft.model ?? '',
            placeholder: t('settings.modelId'),
            onChange: (event) => onPatch({ model: event.target.value.length > 0 ? event.target.value : null }),
          }),
        ])
      return h('div', { className: 'ma-roleCard', 'data-new': isNew }, [
        h('div', { key: 'head', className: 'ma-cardHead' }, [
          h('div', { key: 'title', className: 'ma-cardTitle' }, [
            h('input', {
              key: 'name',
              className: 'ma-input',
              value: draft.name,
              placeholder: t('settings.namePlaceholder'),
              'aria-label': t('settings.name'),
              onChange: (event) => onPatch({ name: event.target.value }),
            }),
            h('span', { key: 'badge', className: `ma-badge${draft.builtin ? ' ma-badge--builtin' : ''}` }, draft.builtin ? t('settings.builtin') : t('settings.custom')),
            isNew ? null : h('span', { key: 'id', className: 'ma-code' }, draft.id),
          ]),
          isNew
            ? h('button', { key: 'cancel', type: 'button', className: 'ma-btn ma-btn--ghost', onClick: onCancel }, t('settings.cancel'))
            : null,
        ]),
        h('div', { key: 'description', className: 'ma-field' }, [
          h('label', { key: 'label' }, t('settings.description')),
          h('textarea', {
            key: 'input',
            className: 'ma-input',
            rows: 2,
            value: draft.description,
            placeholder: t('settings.descriptionPlaceholder'),
            onChange: (event) => onPatch({ description: event.target.value }),
          }),
        ]),
        h('div', { key: 'grid', className: 'ma-fieldGrid' }, [
          h('div', { key: 'model', className: 'ma-field ma-field--wide' }, [
            h('label', { key: 'label' }, t('settings.model')),
            modelField,
          ]),
          h('div', { key: 'effort', className: 'ma-field' }, [
            h('label', { key: 'label' }, t('settings.effort')),
            h('select', {
              className: 'ma-input',
              value: draft.reasoningEffort ?? '',
              disabled: efforts.length === 0 && catalogReady && draft.model !== null,
              onChange: (event) => onPatch({ reasoningEffort: event.target.value.length > 0 ? event.target.value : null }),
            }, [
              h('option', { key: 'follow', value: '' }, t('settings.followDefault')),
              ...efforts.map((effort) => h('option', { key: effort.id, value: effort.id }, effort.name)),
            ]),
            efforts.length === 0 && catalogReady && draft.model !== null
              ? h('span', { key: 'hint', className: 'ma-hint' }, t('settings.noReasoning'))
              : null,
          ]),
          h('div', { key: 'parallel', className: 'ma-field ma-field--small' }, [
            h('label', { key: 'label' }, t('settings.parallel')),
            h('input', {
              className: 'ma-input',
              type: 'number',
              min: 1,
              max: 8,
              step: 1,
              value: String(draft.maxParallel),
              onChange: (event) => onPatch({ maxParallel: Number(event.target.value) }),
            }),
            h('span', { key: 'hint', className: 'ma-hint' }, t('settings.parallelHint')),
          ]),
        ]),
        h('div', { key: 'readonly', className: 'ma-switchRow' }, [
          h('button', {
            key: 'toggle',
            type: 'button',
            className: 'ma-switch',
            role: 'switch',
            'aria-checked': draft.readOnly,
            onClick: () => onPatch({ readOnly: !draft.readOnly }),
          }, [
            h('span', { key: 'track', className: 'ma-switchTrack', 'aria-hidden': true }),
            h('span', { key: 'label' }, t('settings.readOnly')),
          ]),
          h('span', { key: 'hint', className: 'ma-hint' }, t('settings.readOnlyHint')),
        ]),
        h('details', { key: 'instructions', className: 'ma-details' }, [
          h('summary', { key: 'summary' }, t('settings.instructions')),
          h('div', { key: 'body', className: 'ma-detailsBody' }, [
            h('textarea', {
              key: 'input',
              className: 'ma-input',
              rows: 2,
              value: draft.instructions,
              placeholder: t('settings.instructionsPlaceholder'),
              onChange: (event) => onPatch({ instructions: event.target.value }),
            }),
            h('p', { key: 'hint', className: 'ma-hint' }, t('settings.instructionsHint')),
          ]),
        ]),
        h('div', { key: 'foot', className: 'ma-cardFoot' }, [
          h('button', {
            key: 'save',
            type: 'button',
            className: 'ma-btn ma-btn--primary',
            disabled: busy || draft.name.trim().length === 0,
            onClick: onSave,
          }, busy ? t('settings.saving') : t('settings.save')),
          isNew
            ? null
            : h('button', {
              key: 'delete',
              type: 'button',
              className: 'ma-btn ma-btn--danger',
              disabled: busy || draft.builtin,
              title: draft.builtin ? t('settings.deleteBuiltin') : t('settings.delete'),
              onClick: onDelete,
            }, t('settings.delete')),
        ]),
      ])
    }

    /** Bundle-page role manager. */
    function RoleSettingsPage(props) {
      const t = props.t
      const call = props.call
      const loadModels = props.loadModels
      const [roles, setRoles] = React.useState(null)
      const [drafts, setDrafts] = React.useState({})
      const [newDraft, setNewDraft] = React.useState(null)
      const [catalog, setCatalog] = React.useState({ status: 'loading', groups: [] })
      const [busy, setBusy] = React.useState(null)
      const [error, setError] = React.useState('')
      const [notice, setNotice] = React.useState('')
      const [confirmDelete, setConfirmDelete] = React.useState(null)
      const [confirmReset, setConfirmReset] = React.useState(false)
      const tRef = React.useRef(t)
      tRef.current = t

      const adopt = React.useCallback((list) => {
        setRoles(list)
        const next = {}
        for (const role of list) next[role.id] = { ...role }
        setDrafts(next)
      }, [])

      const reload = React.useCallback(async () => {
        try {
          const value = await call('roles.list', {})
          adopt(value.roles)
        } catch (failure) {
          setError(format(tRef.current('settings.loadError'), { message: failure instanceof Error ? failure.message : String(failure) }))
        }
      }, [adopt, call])

      React.useEffect(() => { void reload() }, [reload])

      React.useEffect(() => {
        let alive = true
        void (async () => {
          try {
            const value = await loadModels()
            if (!alive) return
            setCatalog({ status: 'ready', groups: value.groups ?? [] })
          } catch {
            if (!alive) return
            setCatalog({ status: 'error', groups: [] })
          }
        })()
        return () => { alive = false }
      }, [loadModels])

      const patch = (id, fields) => {
        setDrafts((previous) => ({ ...previous, [id]: { ...previous[id], ...fields } }))
      }

      const save = async (id) => {
        const draft = id === '' ? newDraft : drafts[id]
        if (draft === null || draft === undefined) return
        setBusy(id)
        setError('')
        setNotice('')
        try {
          await call('roles.save', { role: { ...draft } })
          setNotice(id === '' ? t('settings.added') : t('settings.saved'))
          setNewDraft(null)
          await reload()
        } catch (failure) {
          setError(format(t('settings.error'), { message: failure instanceof Error ? failure.message : String(failure) }))
        } finally {
          setBusy(null)
        }
      }

      const remove = async (role) => {
        if (confirmDelete !== role.id) {
          setConfirmDelete(role.id)
          return
        }
        setBusy(role.id)
        setError('')
        setNotice('')
        try {
          await call('roles.delete', { id: role.id })
          setConfirmDelete(null)
          setNotice(t('settings.deleted'))
          await reload()
        } catch (failure) {
          setError(format(t('settings.error'), { message: failure instanceof Error ? failure.message : String(failure) }))
        } finally {
          setBusy(null)
        }
      }

      const reset = async () => {
        if (!confirmReset) {
          setConfirmReset(true)
          return
        }
        setBusy('__reset__')
        setError('')
        setNotice('')
        try {
          await call('roles.reset', {})
          setConfirmReset(false)
          setNotice(t('settings.resetDone'))
          await reload()
        } catch (failure) {
          setError(format(t('settings.error'), { message: failure instanceof Error ? failure.message : String(failure) }))
        } finally {
          setBusy(null)
        }
      }

      const add = () => {
        if (newDraft !== null) return
        setNewDraft({
          id: '',
          name: t('settings.newRole'),
          description: '',
          provider: null,
          model: null,
          reasoningEffort: null,
          maxParallel: 2,
          readOnly: false,
          instructions: '',
          builtin: false,
        })
      }

      if (roles === null) {
        return h('div', { className: 'ma-settings' }, error.length > 0
          ? h('p', { className: 'ma-hint', 'data-error': true }, error)
          : h('p', { className: 'ma-loading' }, t('settings.loading')))
      }

      const cards = roles.map((role) => {
        const draft = drafts[role.id] ?? { ...role }
        return h(RoleEditor, {
          key: role.id,
          t,
          role: draft,
          catalog,
          busy: busy === role.id,
          onPatch: (fields) => patch(role.id, fields),
          onSave: () => void save(role.id),
          onDelete: () => void remove(draft),
          onCancel: () => undefined,
        })
      })
      if (newDraft !== null) {
        cards.push(h(RoleEditor, {
          key: '__new__',
          t,
          role: newDraft,
          catalog,
          busy: busy === '',
          onPatch: (fields) => setNewDraft((previous) => ({ ...previous, ...fields })),
          onSave: () => void save(''),
          onDelete: () => undefined,
          onCancel: () => setNewDraft(null),
        }))
      }

      return h('div', { className: 'ma-settings' }, [
        h('div', { key: 'head', className: 'ma-settingsHead' }, [
          h('div', { key: 'text' }, [
            h('h2', { key: 'title' }, t('settings.title')),
            h('p', { key: 'intro' }, t('settings.intro')),
          ]),
          h('div', { key: 'actions', className: 'ma-settingsActions' }, [
            h('button', { key: 'add', type: 'button', className: 'ma-btn', onClick: add, disabled: newDraft !== null }, [IconPlus(12), t('settings.add')]),
          ]),
        ]),
        error.length > 0 ? h('div', { key: 'error', className: 'ma-errorBanner', role: 'alert' }, error) : null,
        notice.length > 0 ? h('p', { key: 'notice', className: 'ma-notice' }, notice) : null,
        catalog.status === 'loading' ? h('p', { key: 'catalog', className: 'ma-hint' }, t('settings.catalogLoading')) : null,
        catalog.status === 'error' ? h('p', { key: 'catalog', className: 'ma-hint' }, t('settings.catalogError')) : null,
        ...cards,
        h('div', { key: 'foot', className: 'ma-settingsFoot' }, [
          h('button', {
            key: 'reset',
            type: 'button',
            className: 'ma-btn ma-btn--ghost',
            disabled: busy !== null,
            onClick: () => void reset(),
          }, confirmReset ? t('settings.resetConfirm') : t('settings.reset')),
          h('p', { key: 'hint', className: 'ma-settingsNote' }, t('settings.persistHint')),
        ]),
      ])
    }

    /** Summary/value wrapper for the bundle config slot. */
    function RoleSettings(props) {
      if (props.view === 'summary') {
        const summary = props.t === undefined ? '' : props.t('settings.summaryShort')
        return h('div', { className: 'ma-bundleSummary' }, summary)
      }
      return h(RoleSettingsPage, props)
    }

    /** Client plugin body. */
    return {
      inject: ['locale', 'slots', 'sidebarRightTabs', 'sidebarRight', 'uiWorkspace', 'remote', 'remote.session'],
      apply(ctx) {
        const t = ctx.locale.bind(NS)

        ctx.effect(() => ctx.locale.register(NS, 'zh', zh), 'multi-agent: zh copy')
        ctx.effect(() => ctx.locale.register(NS, 'en', en), 'multi-agent: en copy')

        const tag = document.createElement('style')
        tag.dataset.plugin = ID
        tag.textContent = CSS
        ctx.effect(() => {
          document.head.appendChild(tag)
          return () => tag.remove()
        }, 'multi-agent: styles')

        const call = async (endpoint, payload, signal) => {
          const response = await globalThis.fetch(ROUTE, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ endpoint, payload: payload ?? {} }),
            ...(signal === undefined ? {} : { signal }),
          })
          if (!response.ok) throw new Error(`Multi-agent request failed (HTTP ${response.status})`)
          const result = await response.json()
          if (!result || result.ok !== true) {
            const error = new Error(result?.error?.message ?? 'Multi-agent request failed')
            error.code = result?.error?.code
            throw error
          }
          return result.value
        }

        const openChild = (sessionId) => {
          try {
            ctx.uiWorkspace.openSession(sessionId)
          } catch (failure) {
            console.warn('multi-agent: cannot open child session', failure)
          }
        }

        const openAside = (entry) => {
          try {
            const query = new URLSearchParams({ parent: entry.parentId, mode: entry.mode })
            ctx.sidebarRight.openResource(
              `dsh-resource://subagentchat/session/${encodeURIComponent(entry.id)}?${query}`,
              { kind: 'subagentchat', preferNewPane: true },
            )
          } catch (failure) {
            console.warn('multi-agent: cannot open child aside', failure)
          }
        }

        const loadModels = async () => {
          const response = await ctx.remote.session.modelCatalog()
          if (!response.ok) throw new Error(response.error?.message ?? 'model catalog unavailable')
          return response.value
        }

        const face = { call, openChild, openAside, loadModels }

        ctx.effect(() => ctx.sidebarRightTabs.register({
          id: ID,
          kind: KIND,
          keepMounted: true,
          title: () => t('title'),
          guide: [{
            id: 'multi-agent',
            order: 16,
            title: () => t('guide.title'),
            description: () => t('guide.description'),
            icon: PanelIcon,
          }],
        }), 'multi-agent: sidebar tab type')

        ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
          name: 'sidebar.right.pane.tab',
          key: ID,
          locale: NS,
          inject: () => face,
        }, RosterPanel)), 'multi-agent: sidebar body')

        ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
          name: 'sidebar.right.pane.tab.title',
          key: ID,
          locale: NS,
        }, RosterTitle)), 'multi-agent: sidebar title')

        ctx.effect(() => ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
          name: 'plugins.bundle.config',
          key: ID,
          locale: NS,
          inject: () => face,
        }, RoleSettings)), 'multi-agent: bundle role settings')

        ctx.inject(['commandUi'], (commandCtx) => {
          commandCtx.effect(() => commandCtx.commandUi.register({
            name: 'agents',
            label: () => t('command.label'),
            description: () => t('command.description'),
            icon: PanelIcon,
            available: () => true,
            ui: {
              kind: 'action',
              run() {
                try {
                  ctx.sidebarRight.openTab(KIND)
                } catch (failure) {
                  console.error(`multi-agent: cannot open the roster: ${String(failure)}`)
                }
              },
            },
          }), 'multi-agent: /agents command')
        })
      },
    }
  },
})
