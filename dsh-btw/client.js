/**
 * Browser half of the Side question (旁问) bundle.
 *
 * A right-Sidebar page and a client-only `/btw` command. The conversation lives
 * only in this component tree and is lost when the tab closes or the page
 * reloads; nothing is sent back to the main conversation.
 */
window.__ModuleLoader__.load({
  id: '@tanlinfeng/dsh-btw',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'btw'
    const ID = '@tanlinfeng/dsh-btw'
    const KIND = 'btw'
    const ROUTE = '/api/btw/chat'

    const zh = {
      title: '旁问',
      subtitle: '读取当前会话 · 不写入上下文',
      'guide.title': '旁问',
      'guide.description': '解释术语、概念或代码，不写入主会话',
      'command.label': '旁问',
      'command.description': '打开旁问：读取当前会话，但不写入主会话上下文',
      'empty.title': '有不懂的地方，直接问',
      'empty.body': '旁问会把当前会话当作背景，帮你解释术语、概念或代码。这里的问答不会进入主会话。',
      'empty.privacy': '仅保存在当前页面内存 · 关闭标签页即清空',
      placeholder: '问一个术语、概念或想法…',
      send: '发送',
      stop: '停止',
      clear: '清空',
      'confirm.clear': '确认清空',
      'clear.aria': '清空旁问',
      copy: '复制',
      copied: '已复制',
      'copy.aria': '复制回答',
      retry: '重试',
      'error.title': '旁问失败',
      'error.network': '网络请求失败：{message}',
      'error.http': '请求被拒绝：{message}',
      'error.empty': '没有收到回答。',
      'context.used': '已引用当前会话 · {count} 条消息',
      'context.truncated': ' · 已截断',
      'context.streaming': ' · 含生成中回答',
      'context.none': '尚未读取主会话上下文',
      you: '你',
      assistant: '旁问',
      thinking: '正在思考…',
      stopped: '已停止',
      'status.stopped': '回答已停止',
      'status.error': '回答中断',
      'tool.running': '查询中',
      'tool.ok': '完成',
      'tool.error': '失败',
      'tool.read': '读取',
      'tool.glob': '查找文件',
      'tool.grep': '搜索',
      'tool.result': '结果',
      'tool.args': '参数',
      'footer.hint': 'Enter 发送 · Shift+Enter 换行',
      'footer.privacy': '不写入主会话',
      'stop.aria': '停止回答',
    }

    const en = {
      title: 'Side question',
      subtitle: 'Reads this session · does not write to it',
      'guide.title': 'Side question',
      'guide.description': 'Explain terms, concepts, or code without touching the main session',
      'command.label': 'Side question',
      'command.description': 'Open Side question: read this session, but do not write to its context',
      'empty.title': 'Ask what you are unsure about',
      'empty.body': 'Side question reads this session as background and explains terms, concepts, or code. Nothing you ask or receive here enters the main session.',
      'empty.privacy': 'Lives in this page only · closing the tab clears it',
      placeholder: 'Ask about a term, concept, or idea…',
      send: 'Send',
      stop: 'Stop',
      clear: 'Clear',
      'confirm.clear': 'Clear it?',
      'clear.aria': 'Clear side question',
      copy: 'Copy',
      copied: 'Copied',
      'copy.aria': 'Copy answer',
      retry: 'Retry',
      'error.title': 'Side question failed',
      'error.network': 'Network request failed: {message}',
      'error.http': 'Request refused: {message}',
      'error.empty': 'No answer was returned.',
      'context.used': 'Using this session · {count} messages',
      'context.truncated': ' · truncated',
      'context.streaming': ' · includes an in-progress answer',
      'context.none': 'No main-session context read yet',
      you: 'You',
      assistant: 'Side question',
      thinking: 'Thinking…',
      stopped: 'Stopped',
      'status.stopped': 'Answer stopped',
      'status.error': 'Answer interrupted',
      'tool.running': 'Working',
      'tool.ok': 'Done',
      'tool.error': 'Failed',
      'tool.read': 'Read',
      'tool.glob': 'Find files',
      'tool.grep': 'Search',
      'tool.result': 'Result',
      'tool.args': 'Arguments',
      'footer.hint': 'Enter to send · Shift+Enter for a new line',
      'footer.privacy': 'Never written to the main session',
      'stop.aria': 'Stop answering',
    }

    const CSS = `
.btw-page{box-sizing:border-box;width:100%;height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13.5px;line-height:1.65}
.btw-head{flex:none;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:13px 16px 10px;border-bottom:.5px solid var(--dsw-alias-border-l1,var(--dsw-alias-border-l2))}
.btw-headText{min-width:0}
.btw-headText h1{margin:0;font-size:15px;font-weight:600;line-height:22px;letter-spacing:.01em}
.btw-headText p{margin:2px 0 0;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-size:11.5px;line-height:17px}
.btw-headActions{display:flex;align-items:center;gap:4px;flex:none}
.btw-iconBtn{display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:26px;padding:0 7px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font:inherit;font-size:11.5px;cursor:pointer;white-space:nowrap}
.btw-iconBtn:hover{background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent));color:var(--dsw-alias-label-primary)}
.btw-iconBtn[data-confirm=true]{color:var(--dsw-alias-state-error-primary)}
.btw-scroll{flex:1;min-height:0;overflow:auto;scrollbar-gutter:stable}
.btw-content{box-sizing:border-box;width:100%;max-width:760px;margin:0 auto;padding:14px 16px 22px;display:flex;flex-direction:column;gap:16px}
.btw-empty{padding:22px 2px 4px;display:flex;flex-direction:column;gap:10px}
.btw-emptyIcon{display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:15px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent);color:var(--dsw-alias-brand-primary)}
.btw-emptyTitle{margin:4px 0 0;font-size:17px;font-weight:600;line-height:26px}
.btw-emptyBody{margin:0;max-width:520px;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}
.btw-emptyPrivacy{margin:2px 0 0;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-size:11.5px;line-height:18px}
.btw-context{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-height:18px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-size:11.5px;line-height:18px}
.btw-contextDot{width:6px;height:6px;flex:none;border-radius:50%;background:var(--dsw-alias-state-success-primary,var(--dsw-alias-brand-primary))}
.btw-message{display:flex;flex-direction:column;gap:7px;min-width:0}
.btw-message[data-role=user]{align-items:flex-end}
.btw-userBubble{max-width:88%;padding:8px 12px;border-radius:14px 14px 4px 14px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);white-space:pre-wrap;overflow-wrap:anywhere}
.btw-assistant{display:flex;flex-direction:column;gap:8px;min-width:0}
.btw-assistantHead{display:flex;align-items:center;gap:6px;min-height:20px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-size:11px;line-height:18px}
.btw-assistantMark{display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-brand-primary)}
.btw-assistantName{font-weight:500;letter-spacing:.01em}
.btw-assistantHead .btw-copy{margin-left:auto}
.btw-copy{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));cursor:pointer}
.btw-copy:hover{background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent));color:var(--dsw-alias-label-primary)}
.btw-status{font-size:10.5px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}
.btw-status[data-kind=error]{color:var(--dsw-alias-state-error-primary)}
.btw-assistantBody{color:var(--dsw-alias-label-primary);font-size:13.8px;line-height:1.72;overflow-wrap:anywhere}
.btw-cursor{display:inline-block;width:6px;height:15px;margin:1px 0 -2px 3px;border-radius:2px;background:var(--dsw-alias-brand-primary);animation:btw-blink 1s ease-in-out infinite;vertical-align:baseline}
.btw-typing{display:inline-flex;align-items:center;gap:4px;height:20px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}
.btw-typing i{display:block;width:4px;height:4px;border-radius:50%;background:currentColor;animation:btw-pulse 1.2s ease-in-out infinite}
.btw-typing i:nth-child(2){animation-delay:.15s}
.btw-typing i:nth-child(3){animation-delay:.3s}
.btw-tools{display:flex;flex-direction:column;gap:5px}
.btw-tool{border:.5px solid var(--dsw-alias-border-l1,var(--dsw-alias-border-l2));border-radius:10px;background:var(--dsw-alias-bg-layer-1);overflow:hidden}
.btw-tool summary{list-style:none;cursor:pointer}
.btw-tool summary::-webkit-details-marker{display:none}
.btw-toolHead{display:flex;align-items:center;gap:7px;min-height:30px;padding:4px 9px}
.btw-toolIcon{display:inline-flex;flex:none;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}
.btw-toolName{flex:none;color:var(--dsw-alias-label-secondary);font-size:11.5px;font-weight:500}
.btw-toolArg{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px}
.btw-toolState{flex:none;display:inline-flex;align-items:center;justify-content:center;min-width:14px;color:var(--dsw-alias-state-success-primary,var(--dsw-alias-brand-primary))}
.btw-tool[data-state=error] .btw-toolState{color:var(--dsw-alias-state-error-primary)}
.btw-spinner{display:block;width:10px;height:10px;border:1.5px solid color-mix(in srgb,var(--dsw-alias-label-primary) 18%,transparent);border-top-color:var(--dsw-alias-brand-primary);border-radius:50%;animation:btw-spin .8s linear infinite}
.btw-toolBody{padding:7px 9px 8px;border-top:.5px solid var(--dsw-alias-border-l1,var(--dsw-alias-border-l2));max-height:220px;overflow:auto}
.btw-toolBody pre{margin:0;color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.2px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}
.btw-error{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:8px 10px;border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 9%,transparent);color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}
.btw-errorText{min-width:0;overflow-wrap:anywhere}
.btw-retry{flex:none;padding:1px 7px;border:.5px solid currentColor;border-radius:7px;background:transparent;color:inherit;font:inherit;font-size:11.5px;line-height:18px;cursor:pointer}
.btw-retry:hover{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent)}
.btw-composer{flex:none;padding:9px 16px 12px;background:var(--dsw-alias-bg-base);border-top:.5px solid var(--dsw-alias-border-l1,var(--dsw-alias-border-l2))}
.btw-composerInner{box-sizing:border-box;max-width:760px;margin:0 auto;padding:7px 7px 5px 12px;display:flex;flex-direction:column;gap:3px;border:.5px solid var(--dsw-alias-border-l1,var(--dsw-alias-border-l2));border-radius:14px;background:var(--dsw-alias-bg-layer-1)}
.btw-composerInner:focus-within{border-color:var(--dsw-alias-brand-primary)}
.btw-input{box-sizing:border-box;width:100%;min-height:24px;max-height:160px;padding:2px 0;border:0;outline:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13.5px;line-height:1.55;resize:none}
.btw-input::placeholder{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}
.btw-input:focus,.btw-input:focus-visible{outline:0;box-shadow:none}
.btw-composerRow{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:28px}
.btw-hint{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-size:10.5px;line-height:16px}
.btw-send,.btw-stop{display:inline-flex;align-items:center;gap:5px;height:27px;padding:0 11px;border:0;border-radius:14px;font:inherit;font-size:12px;line-height:1;cursor:pointer;white-space:nowrap}
.btw-send{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-foreground,var(--dsw-alias-bg-base))}
.btw-send:hover:not(:disabled){filter:brightness(1.06)}
.btw-send:disabled{opacity:.4;cursor:default}
.btw-stop{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);color:var(--dsw-alias-state-warn-primary)}
.btw-stop:hover{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 22%,transparent)}
.btw-footNote{max-width:760px;margin:5px auto 0;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-size:10.5px;line-height:16px;text-align:center}
.btw-md p{margin:0 0 8px}
.btw-md p:last-child{margin-bottom:0}
.btw-md h1,.btw-md h2,.btw-md h3,.btw-md h4{margin:13px 0 6px;font-weight:600;line-height:1.35}
.btw-md h1{font-size:16px}
.btw-md h2{font-size:15px}
.btw-md h3{font-size:14px}
.btw-md h4{font-size:13.5px}
.btw-md h1:first-child,.btw-md h2:first-child,.btw-md h3:first-child,.btw-md h4:first-child{margin-top:0}
.btw-md ul,.btw-md ol{margin:4px 0 9px;padding-left:20px}
.btw-md li{margin:2px 0}
.btw-md li>p{margin:0}
.btw-md blockquote{margin:8px 0;padding:1px 0 1px 10px;border-left:2px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
.btw-md code{padding:1px 4px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.92em}
.btw-md pre{margin:8px 0;padding:9px 11px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);overflow:auto;max-height:320px}
.btw-md pre code{padding:0;background:transparent;font-size:11.8px;line-height:1.55;white-space:pre}
.btw-md a{color:var(--dsw-alias-brand-primary);text-decoration:none}
.btw-md a:hover{text-decoration:underline;text-underline-offset:2px}
.btw-md hr{margin:12px 0;border:0;border-top:.5px solid var(--dsw-alias-border-l1,var(--dsw-alias-border-l2))}
.btw-tableWrap{margin:8px 0;overflow:auto;max-width:100%}
.btw-md table{border-collapse:collapse;min-width:100%;font-size:12px;line-height:1.55}
.btw-md th,.btw-md td{padding:5px 8px;border:.5px solid var(--dsw-alias-border-l1,var(--dsw-alias-border-l2));text-align:left;vertical-align:top}
.btw-md th{background:var(--dsw-alias-bg-layer-2);font-weight:600}
.btw-tabTitle{display:inline-flex;align-items:center;gap:6px;min-width:0}
.btw-tabTitle span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.btw-page button:focus-visible,.btw-page a:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
@keyframes btw-spin{to{transform:rotate(360deg)}}
@keyframes btw-blink{0%,100%{opacity:1}50%{opacity:.2}}
@keyframes btw-pulse{0%,100%{opacity:.35;transform:translateY(0)}50%{opacity:1;transform:translateY(-1px)}}
@media (prefers-reduced-motion:reduce){.btw-spinner,.btw-cursor,.btw-typing i{animation:none}.btw-cursor{opacity:1}}
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

    function IconBtw(sizeOrProps) {
      const size = typeof sizeOrProps === 'number' ? sizeOrProps : sizeOrProps?.size
      return strokes(size ?? 20, [
        'M4.1 4.9h11.8a2 2 0 0 1 2 2v5.1a2 2 0 0 1-2 2H9.7l-3.7 2.5V14H4.1a2 2 0 0 1-2-2V6.9a2 2 0 0 1 2-2z',
        'M7.3 8.2a2.7 2.7 0 1 1 3.5 2.6c-.5.2-.8.6-.8 1.1v.2',
        'M10 13.9h.01',
      ], 1.5)
    }

    function IconSend(size) {
      return strokes(size ?? 14, ['M3 10l13-6-4.6 12-1.9-4.1L3 10z', 'M9.5 11.9L16 4'], 1.5)
    }

    function IconStop(size) {
      return strokes(size ?? 13, ['M5.5 5.5h9v9h-9z'], 1.8)
    }

    function IconTrash(size) {
      return strokes(size ?? 14, ['M4 6.2h12', 'M8 6.2V4.5h4v1.7', 'M6.1 6.2l.6 9h6.6l.6-9', 'M8.6 8.8v4.2', 'M11.4 8.8v4.2'], 1.4)
    }

    function IconCopy(size) {
      return strokes(size ?? 13, ['M7 6.5V4.8c0-.7.6-1.3 1.3-1.3h6.4c.7 0 1.3.6 1.3 1.3v6.4c0 .7-.6 1.3-1.3 1.3h-1.7', 'M4 7.5h6.5c.8 0 1.5.7 1.5 1.5v6.5c0 .8-.7 1.5-1.5 1.5H4c-.8 0-1.5-.7-1.5-1.5V9c0-.8.7-1.5 1.5-1.5z'], 1.4)
    }

    function IconCheck(size) {
      return strokes(size ?? 12, ['M3.8 10.2l4 4 8.4-8.6'], 2)
    }

    function IconX(size) {
      return strokes(size ?? 11, ['M4.2 4.2l11.6 11.6', 'M15.8 4.2L4.2 15.8'], 1.8)
    }

    function IconTool(name, size) {
      const common = size ?? 12
      if (name === 'read') return strokes(common, ['M5 3.5h10v13H5z', 'M7.5 7h5', 'M7.5 10h5', 'M7.5 13h3'], 1.3)
      if (name === 'glob') return strokes(common, ['M3 6.2h5l1.3 1.6H17v7.7H3z', 'M3 6.2V5.1c0-.6.4-1 1-1h3.2l1.3 1.5H16c.6 0 1 .4 1 1v.6'], 1.3)
      return strokes(common, ['M9 3.8a5.2 5.2 0 1 0 0 10.4A5.2 5.2 0 0 0 9 3.8z', 'M12.8 12.8L17 17'], 1.5)
    }

    /** Guide card artwork uses the same recognizable bubble as the tab. */
    function GuideBtw({ size }) {
      return h('span', {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size ?? 20,
          height: size ?? 20,
          borderRadius: 6,
          background: 'color-mix(in srgb, currentColor 12%, transparent)',
          color: 'var(--dsw-alias-brand-primary)',
        },
      }, IconBtw((size ?? 20) - 4))
    }

    /** Stable local ids for optimistic messages and tool cards. */
    let localSeq = 0
    function nextId(prefix) {
      localSeq += 1
      return `${prefix}-${Date.now().toString(36)}-${localSeq}`
    }

    function safeHref(raw) {
      const value = String(raw).trim()
      if (value.length === 0) return undefined
      if (/^(https?:\/\/|mailto:)/i.test(value)) return value
      if (value.startsWith('/') || value.startsWith('#') || value.startsWith('./') || value.startsWith('../')) return value
      return undefined
    }

    function renderInline(text, keyPrefix) {
      if (typeof text !== 'string' || text.length === 0) return []
      const output = []
      const token = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(\[[^\]\n]+\]\([^)\s]+\))/g
      let last = 0
      let match
      let index = 0
      while ((match = token.exec(text)) !== null) {
        if (match.index > last) output.push(text.slice(last, match.index))
        const value = match[0]
        const key = `${keyPrefix}-i${index}`
        index += 1
        if (value.startsWith('`')) {
          output.push(h('code', { key }, value.slice(1, -1)))
        } else if (value.startsWith('**')) {
          output.push(h('strong', { key }, value.slice(2, -2)))
        } else if (value.startsWith('*')) {
          output.push(h('em', { key }, value.slice(1, -1)))
        } else {
          const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(value)
          const href = link === null ? undefined : safeHref(link[2])
          if (link !== null && href !== undefined) {
            output.push(h('a', { key, href, target: '_blank', rel: 'noreferrer noopener' }, link[1]))
          } else {
            output.push(value)
          }
        }
        last = match.index + value.length
      }
      if (last < text.length) output.push(text.slice(last))
      return output
    }

    function splitRow(line) {
      return String(line).trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())
    }

    function isSeparatorRow(line) {
      const cells = splitRow(line)
      return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell))
    }

    function renderTable(lines, start, key) {
      const header = splitRow(lines[start])
      const rows = []
      let index = start + 2
      while (index < lines.length && lines[index].trim().length > 0 && lines[index].includes('|')) {
        rows.push(splitRow(lines[index]))
        index += 1
      }
      const head = h('thead', { key: 'head' }, h('tr', null, header.map((cell, cellIndex) => h('th', { key: cellIndex }, renderInline(cell, `${key}-h${cellIndex}`)))))
      const body = h('tbody', { key: 'body' }, rows.map((row, rowIndex) => h('tr', { key: rowIndex }, header.map((_, cellIndex) => h('td', { key: cellIndex }, renderInline(row[cellIndex] ?? '', `${key}-r${rowIndex}c${cellIndex}`))))))
      return {
        node: h('div', { className: 'btw-tableWrap' }, h('table', null, [head, body])),
        next: index,
      }
    }

    function isBlockStart(line) {
      return /^```/.test(line)
        || /^#{1,4}\s+/.test(line)
        || /^>\s?/.test(line)
        || /^\s*[-*+]\s+/.test(line)
        || /^\s*\d+\.\s+/.test(line)
        || /^\s*(---|\*\*\*|___)\s*$/.test(line)
    }

    /** Small, safe Markdown renderer: no raw HTML and no network image loading. */
    function renderMarkdown(text) {
      const lines = String(text ?? '').replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n')
      const blocks = []
      let index = 0
      let key = 0
      while (index < lines.length) {
        const line = lines[index]
        if (line.trim().length === 0) {
          index += 1
          continue
        }

        const fence = /^```(.*)$/.exec(line)
        if (fence !== null) {
          const code = []
          index += 1
          while (index < lines.length && !/^```/.test(lines[index])) {
            code.push(lines[index])
            index += 1
          }
          if (index < lines.length) index += 1
          blocks.push(h('pre', { key: key++, 'data-lang': fence[1].trim() }, h('code', null, code.join('\n'))))
          continue
        }

        const heading = /^(#{1,4})\s+(.*)$/.exec(line)
        if (heading !== null) {
          const level = heading[1].length
          blocks.push(h(`h${level}`, { key: key++ }, renderInline(heading[2], `md${key}`)))
          index += 1
          continue
        }

        if (/^>\s?/.test(line)) {
          const quote = []
          while (index < lines.length) {
            const quoted = /^>\s?(.*)$/.exec(lines[index])
            if (quoted === null) break
            quote.push(quoted[1])
            index += 1
          }
          blocks.push(h('blockquote', { key: key++ }, renderInline(quote.join(' '), `md${key}`)))
          continue
        }

        const bullet = /^\s*[-*+]\s+(.*)$/.exec(line)
        if (bullet !== null) {
          const items = []
          while (index < lines.length) {
            const current = /^\s*[-*+]\s+(.*)$/.exec(lines[index])
            if (current === null) break
            let value = current[1]
            index += 1
            while (index < lines.length && /^\s{2,}\S/.test(lines[index]) && !/^\s*[-*+]\s+/.test(lines[index]) && !/^\s*\d+\.\s+/.test(lines[index])) {
              value += ` ${lines[index].trim()}`
              index += 1
            }
            items.push(value)
          }
          blocks.push(h('ul', { key: key++ }, items.map((item, itemIndex) => h('li', { key: itemIndex }, renderInline(item, `md${key}-${itemIndex}`)))))
          continue
        }

        const ordered = /^\s*\d+\.\s+(.*)$/.exec(line)
        if (ordered !== null) {
          const items = []
          while (index < lines.length) {
            const current = /^\s*\d+\.\s+(.*)$/.exec(lines[index])
            if (current === null) break
            items.push(current[1])
            index += 1
          }
          blocks.push(h('ol', { key: key++ }, items.map((item, itemIndex) => h('li', { key: itemIndex }, renderInline(item, `md${key}-${itemIndex}`)))))
          continue
        }

        if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
          blocks.push(h('hr', { key: key++ }))
          index += 1
          continue
        }

        if (line.includes('|') && index + 1 < lines.length && isSeparatorRow(lines[index + 1])) {
          const table = renderTable(lines, index, `md${key}`)
          blocks.push(h('div', { key: key++ }, table.node))
          index = table.next
          continue
        }

        const paragraph = []
        while (index < lines.length && lines[index].trim().length > 0) {
          if (paragraph.length > 0 && isBlockStart(lines[index])) break
          if (paragraph.length > 0 && lines[index].includes('|') && index + 1 < lines.length && isSeparatorRow(lines[index + 1])) break
          paragraph.push(lines[index].trim())
          index += 1
        }
        if (paragraph.length > 0) {
          blocks.push(h('p', { key: key++ }, renderInline(paragraph.join(' '), `md${key}`)))
        } else {
          index += 1
        }
      }
      return h('div', { className: 'btw-md' }, blocks)
    }

    function toolLabel(t, name) {
      const key = `tool.${name}`
      const value = t(key)
      return value === key ? name : value
    }

    function toolSummary(tool) {
      const args = tool.args !== null && typeof tool.args === 'object' ? tool.args : {}
      if (tool.name === 'read') return String(args.file_path ?? '')
      if (tool.name === 'glob') return [args.pattern, args.path].filter((value) => typeof value === 'string' && value.length > 0).join(' · ')
      if (tool.name === 'grep') return [args.pattern, args.path, args.glob].filter((value) => typeof value === 'string' && value.length > 0).join(' · ')
      if (typeof args.__invalid === 'boolean') return String(args.raw ?? '')
      try {
        return JSON.stringify(args)
      } catch {
        return ''
      }
    }

    function ToolCard({ tool, t }) {
      const summary = toolSummary(tool)
      const running = tool.status === 'running'
      return h('details', {
        className: 'btw-tool',
        'data-state': tool.status,
        open: running ? true : undefined,
      }, [
        h('summary', { key: 'head', className: 'btw-toolHead' }, [
          h('span', { key: 'icon', className: 'btw-toolIcon' }, IconTool(tool.name, 12)),
          h('span', { key: 'name', className: 'btw-toolName' }, toolLabel(t, tool.name)),
          h('span', { key: 'arg', className: 'btw-toolArg', title: summary }, summary),
          h('span', { key: 'state', className: 'btw-toolState', title: running ? t('tool.running') : tool.status === 'error' ? t('tool.error') : t('tool.ok') },
            running ? h('span', { className: 'btw-spinner' }) : tool.status === 'error' ? IconX(11) : IconCheck(11)),
        ]),
        tool.text ? h('div', { key: 'body', className: 'btw-toolBody' }, h('pre', null, tool.text)) : null,
      ])
    }

    function MessageView({ message, t, copied, onCopy }) {
      if (message.role === 'user') {
        return h('div', { className: 'btw-message', 'data-role': 'user' }, h('div', { className: 'btw-userBubble' }, message.content))
      }
      const showCopy = typeof message.content === 'string' && message.content.length > 0 && message.status !== 'streaming'
      return h('div', { className: 'btw-message', 'data-role': 'assistant' },
        h('div', { className: 'btw-assistant' }, [
          h('div', { key: 'head', className: 'btw-assistantHead' }, [
            h('span', { key: 'mark', className: 'btw-assistantMark' }, IconBtw(12)),
            h('span', { key: 'name', className: 'btw-assistantName' }, t('assistant')),
            message.status === 'stopped' ? h('span', { key: 'stopped', className: 'btw-status' }, t('status.stopped')) : null,
            message.status === 'error' ? h('span', { key: 'error', className: 'btw-status', 'data-kind': 'error' }, t('status.error')) : null,
            showCopy ? h('button', {
              key: 'copy',
              type: 'button',
              className: 'btw-copy',
              title: copied ? t('copied') : t('copy.aria'),
              'aria-label': copied ? t('copied') : t('copy.aria'),
              onClick: () => onCopy(message),
            }, copied ? IconCheck(12) : IconCopy(12)) : null,
          ]),
          message.tools !== undefined && message.tools.length > 0
            ? h('div', { key: 'tools', className: 'btw-tools' }, message.tools.map((tool) => h(ToolCard, { key: tool.id, tool, t })))
            : null,
          message.content.length > 0
            ? h('div', { key: 'body', className: 'btw-assistantBody' }, [
              renderMarkdown(message.content),
              message.status === 'streaming' ? h('span', { key: 'cursor', className: 'btw-cursor', 'aria-hidden': true }) : null,
            ])
            : null,
          message.status === 'streaming' && message.content.length === 0
            ? h('div', { key: 'typing', className: 'btw-typing', role: 'status', 'aria-label': t('thinking') }, [h('i', { key: 0 }), h('i', { key: 1 }), h('i', { key: 2 })])
            : null,
        ]),
      )
    }

    /**
     * Decode one SSE response into JSON events.
     * @param response - streaming HTTP response.
     * @param onEvent - event consumer.
     */
    async function consumeEvents(response, onEvent) {
      if (response.body === null) throw new Error('response body is empty')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      const handleBlock = (block) => {
        const data = []
        for (const line of block.replaceAll('\r\n', '\n').split('\n')) {
          if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
        }
        if (data.length === 0) return
        const value = data.join('\n').trim()
        if (value.length === 0) return
        const parsed = JSON.parse(value)
        if (parsed !== null && typeof parsed === 'object') onEvent(parsed)
      }
      try {
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          let boundary
          while ((boundary = buffer.indexOf('\n\n')) >= 0) {
            const block = buffer.slice(0, boundary)
            buffer = buffer.slice(boundary + 2)
            handleBlock(block)
          }
        }
        if (buffer.trim().length > 0) handleBlock(buffer)
      } finally {
        try {
          reader.releaseLock()
        } catch {
          // The reader may already be cancelled by the abort path.
        }
      }
    }

    /**
     * Read one HTTP failure as a short message.
     * @param response - failed response.
     * @returns message text.
     */
    async function responseError(response) {
      try {
        const value = await response.json()
        if (value?.error?.message) return String(value.error.message)
      } catch {
        // Fall through to the status line.
      }
      return `${response.status} ${response.statusText}`.trim()
    }

    /** The right-Sidebar Side question page. */
    function BtwBody({ sessionId, useTabInfo, t }) {
      const { tab } = useTabInfo()
      const [messages, setMessages] = React.useState([])
      const [draft, setDraft] = React.useState('')
      const [streaming, setStreaming] = React.useState(false)
      const [error, setError] = React.useState(null)
      const [context, setContext] = React.useState(null)
      const [confirmClear, setConfirmClear] = React.useState(false)
      const [copiedId, setCopiedId] = React.useState(null)
      const abortRef = React.useRef(null)
      const scrollRef = React.useRef(null)
      const bottomRef = React.useRef(null)
      const textareaRef = React.useRef(null)
      const stickRef = React.useRef(true)

      React.useEffect(() => () => {
        abortRef.current?.abort()
        abortRef.current = null
      }, [])

      React.useEffect(() => {
        if (!confirmClear) return undefined
        const timer = setTimeout(() => setConfirmClear(false), 3000)
        return () => clearTimeout(timer)
      }, [confirmClear])

      React.useEffect(() => {
        const textarea = textareaRef.current
        if (textarea === null) return
        textarea.style.height = '0px'
        textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 24), 160)}px`
      }, [draft])

      React.useEffect(() => {
        if (!tab.visible || messages.length > 0) return undefined
        const frame = requestAnimationFrame(() => textareaRef.current?.focus())
        return () => cancelAnimationFrame(frame)
      }, [tab.visible, messages.length])

      React.useEffect(() => {
        if (!stickRef.current) return
        bottomRef.current?.scrollIntoView({ block: 'end' })
      }, [messages])

      const toHistory = (items) => items
        .filter((message) => message.role === 'user' || (message.role === 'assistant' && message.status !== 'error' && message.status !== 'streaming'))
        .map((message) => ({ role: message.role, content: message.content }))
        .filter((message) => typeof message.content === 'string' && message.content.trim().length > 0)
        .slice(-40)

      const patchAssistant = (assistantId, patch) => {
        setMessages((previous) => previous.map((message) => {
          if (message.id !== assistantId) return message
          return typeof patch === 'function' ? patch(message) : { ...message, ...patch }
        }))
      }

      const runRequest = async (question, history, assistantId) => {
        setMessages((previous) => [...previous, {
          id: assistantId,
          role: 'assistant',
          content: '',
          tools: [],
          status: 'streaming',
        }])
        setStreaming(true)
        setError(null)
        setContext(null)
        stickRef.current = true
        const controller = new AbortController()
        abortRef.current = controller
        let sawDone = false
        let sawError = false
        let sawText = false
        try {
          const response = await fetch(ROUTE, {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
            body: JSON.stringify({ sessionId, question, history }),
            signal: controller.signal,
          })
          if (!response.ok) throw new Error(await responseError(response))

          await consumeEvents(response, (event) => {
            if (event.type === 'context') {
              setContext(event)
              return
            }
            if (event.type === 'delta' && typeof event.text === 'string') {
              sawText = true
              patchAssistant(assistantId, (message) => ({ ...message, content: message.content + event.text, status: 'streaming' }))
              return
            }
            if (event.type === 'tool_start') {
              patchAssistant(assistantId, (message) => {
                const tools = [...message.tools]
                const index = tools.findIndex((tool) => tool.id === event.id)
                const next = { id: event.id, name: String(event.name ?? 'tool'), args: event.args ?? {}, status: 'running', text: '' }
                if (index >= 0) tools[index] = { ...tools[index], ...next }
                else tools.push(next)
                return { ...message, tools }
              })
              return
            }
            if (event.type === 'tool_result') {
              patchAssistant(assistantId, (message) => {
                const tools = [...message.tools]
                const index = tools.findIndex((tool) => tool.id === event.id)
                if (index >= 0) {
                  tools[index] = { ...tools[index], status: event.ok ? 'ok' : 'error', text: String(event.text ?? '') }
                }
                return { ...message, tools }
              })
              return
            }
            if (event.type === 'done') {
              sawDone = true
              patchAssistant(assistantId, { status: 'done' })
              return
            }
            if (event.type === 'error') {
              sawError = true
              patchAssistant(assistantId, { status: 'error' })
              setError({ message: String(event.message ?? t('error.empty')), code: event.code })
            }
          })

          if (!sawDone && !sawError && !controller.signal.aborted) {
            patchAssistant(assistantId, { status: 'error' })
            setError({ message: t('error.empty') })
          } else if (sawDone && !sawText && !sawError) {
            patchAssistant(assistantId, { status: 'error' })
            setError({ message: t('error.empty') })
          }
        } catch (failure) {
          if (controller.signal.aborted) {
            patchAssistant(assistantId, { status: 'stopped' })
          } else {
            patchAssistant(assistantId, { status: 'error' })
            setError({ message: t('error.network', { message: failure instanceof Error ? failure.message : String(failure) }) })
          }
        } finally {
          setStreaming(false)
          if (abortRef.current === controller) abortRef.current = null
        }
      }

      const send = () => {
        if (streaming) return
        const question = draft.trim()
        if (question.length === 0) return
        const history = toHistory(messages)
        const userMessage = { id: nextId('u'), role: 'user', content: question }
        const assistantId = nextId('a')
        setMessages((previous) => [...previous, userMessage])
        setDraft('')
        stickRef.current = true
        void runRequest(question, history, assistantId)
      }

      const stop = () => {
        const controller = abortRef.current
        if (controller === null) return
        controller.abort()
        setStreaming(false)
        setMessages((previous) => previous.map((message) => (
          message.role === 'assistant' && message.status === 'streaming' ? { ...message, status: 'stopped' } : message
        )))
      }

      const clear = () => {
        if (!confirmClear) {
          setConfirmClear(true)
          return
        }
        abortRef.current?.abort()
        abortRef.current = null
        setConfirmClear(false)
        setMessages([])
        setDraft('')
        setStreaming(false)
        setError(null)
        setContext(null)
        setCopiedId(null)
        requestAnimationFrame(() => textareaRef.current?.focus())
      }

      const retryLast = () => {
        if (streaming) return
        const lastUser = [...messages].reverse().find((message) => message.role === 'user')
        if (lastUser === undefined) return
        const index = messages.findIndex((message) => message.id === lastUser.id)
        if (index < 0) return
        const history = toHistory(messages.slice(0, index))
        setMessages(messages.slice(0, index + 1))
        setError(null)
        setContext(null)
        stickRef.current = true
        void runRequest(lastUser.content, history, nextId('a'))
      }

      const copyMessage = async (message) => {
        try {
          await navigator.clipboard.writeText(message.content)
          setCopiedId(message.id)
          setTimeout(() => {
            setCopiedId((current) => current === message.id ? null : current)
          }, 1500)
        } catch {
          // Clipboard denial is not worth a visible error for a convenience action.
        }
      }

      const onKeyDown = (event) => {
        if (event.key !== 'Enter' || event.shiftKey) return
        if (event.nativeEvent?.isComposing === true || event.isComposing === true) return
        event.preventDefault()
        send()
      }

      const onScroll = () => {
        const element = scrollRef.current
        if (element === null) return
        stickRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80
      }

      const lastUser = [...messages].reverse().find((message) => message.role === 'user')
      const contextLabel = context === null
        ? null
        : `${t('context.used', { count: context.messages ?? 0 })}${context.truncated ? t('context.truncated') : ''}${context.streaming ? t('context.streaming') : ''}`

      return h('div', { className: 'btw-page' }, [
        h('header', { key: 'head', className: 'btw-head' }, [
          h('div', { key: 'text', className: 'btw-headText' }, [
            h('h1', { key: 'title' }, t('title')),
            h('p', { key: 'subtitle' }, t('subtitle')),
          ]),
          h('div', { key: 'actions', className: 'btw-headActions' }, [
            messages.length > 0
              ? h('button', {
                key: 'clear',
                type: 'button',
                className: 'btw-iconBtn',
                'data-confirm': confirmClear ? 'true' : 'false',
                title: confirmClear ? t('confirm.clear') : t('clear.aria'),
                'aria-label': confirmClear ? t('confirm.clear') : t('clear.aria'),
                onClick: clear,
              }, confirmClear ? t('confirm.clear') : IconTrash(14))
              : null,
          ]),
        ]),
        h('div', { key: 'scroll', ref: scrollRef, className: 'btw-scroll', onScroll, role: 'log', 'aria-live': 'polite' }, [
          h('div', { key: 'content', className: 'btw-content' }, [
            messages.length === 0
              ? h('div', { key: 'empty', className: 'btw-empty' }, [
                h('div', { key: 'icon', className: 'btw-emptyIcon' }, IconBtw(30)),
                h('h2', { key: 'title', className: 'btw-emptyTitle' }, t('empty.title')),
                h('p', { key: 'body', className: 'btw-emptyBody' }, t('empty.body')),
                h('p', { key: 'privacy', className: 'btw-emptyPrivacy' }, t('empty.privacy')),
              ])
              : [
                contextLabel !== null
                  ? h('div', { key: 'context', className: 'btw-context', title: context?.cwd ?? undefined }, [
                    h('span', { key: 'dot', className: 'btw-contextDot' }),
                    h('span', { key: 'label' }, contextLabel),
                  ])
                  : null,
                ...messages.map((message) => h(MessageView, {
                  key: message.id,
                  message,
                  t,
                  copied: copiedId === message.id,
                  onCopy: copyMessage,
                })),
                error !== null
                  ? h('div', { key: 'error', className: 'btw-error', role: 'alert' }, [
                    h('span', { key: 'text', className: 'btw-errorText' }, error.message),
                    lastUser !== undefined
                      ? h('button', { key: 'retry', type: 'button', className: 'btw-retry', onClick: retryLast }, t('retry'))
                      : null,
                  ])
                  : null,
              ],
            h('div', { key: 'bottom', ref: bottomRef, 'aria-hidden': true }),
          ]),
        ]),
        h('div', { key: 'composer', className: 'btw-composer' }, [
          h('div', { key: 'inner', className: 'btw-composerInner' }, [
            h('textarea', {
              key: 'input',
              ref: textareaRef,
              className: 'btw-input',
              rows: 1,
              value: draft,
              placeholder: t('placeholder'),
              'aria-label': t('placeholder'),
              onChange: (event) => setDraft(event.target.value),
              onKeyDown,
            }),
            h('div', { key: 'row', className: 'btw-composerRow' }, [
              h('span', { key: 'hint', className: 'btw-hint' }, t('footer.hint')),
              streaming
                ? h('button', { key: 'stop', type: 'button', className: 'btw-stop', title: t('stop.aria'), 'aria-label': t('stop.aria'), onClick: stop }, [IconStop(12), t('stop')])
                : h('button', { key: 'send', type: 'button', className: 'btw-send', disabled: draft.trim().length === 0, onClick: send }, [IconSend(14), t('send')]),
            ]),
          ]),
          h('div', { key: 'note', className: 'btw-footNote' }, t('footer.privacy')),
        ]),
      ])
    }

    /** Chip title with the same glyph as the page. */
    function BtwTitle({ t }) {
      return h('span', { className: 'btw-tabTitle' }, [h('span', { key: 'icon' }, IconBtw(14)), h('span', { key: 'label' }, t('title'))])
    }

    /** Client plugin body. */
    return {
      inject: ['locale', 'slots', 'sidebarRightTabs', 'sidebarRight'],
      apply(ctx) {
        const t = ctx.locale.bind(NS)

        ctx.effect(() => ctx.locale.register(NS, 'zh', zh), 'btw: zh copy')
        ctx.effect(() => ctx.locale.register(NS, 'en', en), 'btw: en copy')

        const tag = document.createElement('style')
        tag.dataset.plugin = ID
        tag.textContent = CSS
        ctx.effect(() => {
          document.head.appendChild(tag)
          return () => tag.remove()
        }, 'btw: styles')

        ctx.effect(() => ctx.sidebarRightTabs.register({
          id: ID,
          kind: KIND,
          keepMounted: true,
          title: () => t('title'),
          guide: [{
            id: 'side-question',
            order: 15,
            title: () => t('guide.title'),
            description: () => t('guide.description'),
            icon: GuideBtw,
          }],
        }), 'btw: sidebar tab type')

        ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
          name: 'sidebar.right.pane.tab',
          key: ID,
          locale: NS,
        }, BtwBody)), 'btw: sidebar body')

        ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
          name: 'sidebar.right.pane.tab.title',
          key: ID,
          locale: NS,
        }, BtwTitle)), 'btw: sidebar title')

        ctx.inject(['commandUi'], (commandCtx) => {
          commandCtx.effect(() => commandCtx.commandUi.register({
            name: 'btw',
            label: () => t('command.label'),
            description: () => t('command.description'),
            icon: IconBtw,
            available: () => true,
            ui: {
              kind: 'action',
              run() {
                try {
                  ctx.sidebarRight.openTab(KIND)
                } catch (failure) {
                  console.error(`btw: cannot open sidebar page: ${String(failure)}`)
                }
              },
            },
          }), 'btw: /btw command')
        })
      },
    }
  },
})
