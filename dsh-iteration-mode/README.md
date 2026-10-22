# @tanlinfeng/dsh-iteration-mode

「迭代模式」是一个 agent preset（`id: iterate`），用于 DSH 本身的功能迭代与插件创建。它和自带的 Creator 模式同源——工具箱、技能、plan/compaction/delegation 分组一致——但多了一道闸门：**新会话自动进入 plan mode**，agent 必须先按 grilling 协议逐轮对齐需求，把结论写成契约并通过 `exit_plan_mode` 提交计划，用户审批后才开始实施。

## 组成

| 文件 | 作用 |
|---|---|
| `cordis.patch.yml` | bundle 的 patch：`insert` 一行 `@deepseek-ai/dsh-agent-preset`（`preset-iterate`） |
| `index.js` | `iteration-plan-gate` 插件，挂在 preset 的 `planning` 组里；`startup`/`clear` 会话调用 `ctx.planMode.set(agent, true)` |
| `skills/iteration-alignment/SKILL.md` | grilling 协议、契约模板、DSH 定向说明 |
| `dsh-agent-preset/skills` | 通过 `customSkillDirs` 与自带的造插件技能一起挂载 |

## 行为

- 进入方式：新任务选择器选「迭代模式」（自定义组，不是默认）。
- 首个请求即处于 plan mode：诊断、只读勘察、整轮提问（每问带推荐答案）。
- 恢复/压缩会话沿用会话日志里的 plan 状态，不会重新进入。
- 用户 `/plan off` 是显式接管，视为授权跳过对齐。
- 没有工具 guard：plan 期间工具仍可调用，约束来自 prompt 与审批（按设计取舍）。

## 安装

```bash
# 在 profile 里
dsh plugin add 'link:/home/lftan/DSH/dsh-iteration-mode' --profile web
```

或用 `plugin_manager install_bundle`（`target: link:/home/lftan/DSH/dsh-iteration-mode`）。

## 验证

1. 插件页/`listBundles` 出现 `@tanlinfeng/dsh-iteration-mode`；
2. `cordis_inspect` 的 `Config.listConfigs` 含 `preset-iterate`；
3. 新任务选择器出现「迭代模式」，开新会话后首轮处于 plan mode。
