/**
 * Catalog metadata for the plugins in this repository.
 *
 * `dir` is the package directory; everything else feeds `market/index.json`.
 * Keep one entry per published plugin — `scripts/build-index.mjs` reads it and
 * `scripts/release.mjs` refuses to publish a directory that is missing here.
 */
export const plugins = [
  {
    dir: 'dsh-btw',
    icon: 'dsh-btw/icon.svg',
    category: 'ui',
    keywords: ['sidebar', 'chat', 'side-question', 'read-only'],
    title: {
      en: 'Side question',
      zh: '旁问',
    },
    description: {
      en: 'Ask a side question in the right sidebar without writing to the current session.',
      zh: '在右侧栏提旁问，只读当前会话，不写入任何内容。',
    },
  },
  {
    dir: 'todolist-plugin',
    icon: 'todolist-plugin/icon.svg',
    category: 'ui',
    keywords: ['todo', 'tasks', 'sidebar', 'shared'],
    title: {
      en: 'TodoList',
      zh: '待办清单',
    },
    description: {
      en: 'A shared task list that every session reads and agents claim work from.',
      zh: '跨会话共享的任务面板，agent 从中认领并执行任务。',
    },
  },
  {
    dir: 'multi-agent-plugin',
    icon: 'multi-agent-plugin/icon.svg',
    category: 'agents',
    keywords: ['subagents', 'roles', 'orchestration'],
    title: {
      en: 'Multi-agent',
      zh: '多智能体',
    },
    description: {
      en: 'Role-based subagent orchestration with a sidebar roster and per-role settings.',
      zh: '基于内置 subagent 的角色化编排，带侧栏花名册与按角色配置。',
    },
  },
  {
    dir: 'dsh-iteration-mode',
    icon: null,
    category: 'agents',
    keywords: ['preset', 'plan-mode', 'grilling', 'workflow'],
    title: {
      en: 'Iteration mode',
      zh: '迭代模式',
    },
    description: {
      en: 'An agent preset that grills requirements into a reviewed plan before iterating.',
      zh: '先把需求 grill 成一个经审阅的计划，再开始迭代的 agent preset。',
    },
  },
]
