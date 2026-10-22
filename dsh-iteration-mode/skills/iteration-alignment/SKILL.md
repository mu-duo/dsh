---
name: iteration-alignment
description: Turn an iteration request for DSH itself or a new plugin into an agreed requirement contract before any code exists. Use when the user asks to change the harness, a plugin, a preset, a mode, or the Web UI, and in every Iteration-mode session before implementing.
whenToUse: On the first request of an Iteration-mode session, and whenever a request to change DSH is still a wish rather than a decided design.
---

# Iteration alignment

A request to "add a mode", "improve the panel", or "make the agent do X" is a
wish until it is a tree of decided branches. This skill is the interview that
turns one into a contract, then a reviewed plan, then code.

## The rule

Never implement an unconfirmed wish. Do not edit files, change configuration,
install or remove bundles, or run mutating commands until the user has answered
every open branch and approved the plan through `exit_plan_mode`. Imperative
phrasing ("add", "create", "make it") states the goal, not permission to skip
the interview. A tolerant "ok" to one question approves nothing.

## Design tree and frontier

Model the request as a tree: the goal branches into decisions, and each decision
branches into the decisions that hang off it. The **frontier** is every decision
whose prerequisites are already settled — the questions you can ask now without
guessing an answer you have not heard.

Work in rounds:

1. Find the facts the frontier needs yourself: read files, inspect live
   configuration, list tools and services, read the relevant package READMEs.
   Never ask the user what the environment can answer.
2. Ask the whole frontier in one round. Number the questions, give the options
   where options exist, and state your recommendation for each.
3. Wait for the answers. They settle branches and push the frontier outward;
   recompute it and ask the next round. A question that depends on an answer
   still open belongs to a later round.
4. Stop when the frontier is empty: every branch visited, every rejected option
   recorded, nothing silently assumed.

Round format, in the user's language:

```
❓ **Q1** - **<title>**: <body, options when they exist>

➡️ <your recommended answer>

---

❓ **Q2** - **<title>**: <body>

➡️ <your recommended answer>
```

If the first round finds no real branch, say so and go straight to the contract
— but still list the decisions, recommendations, and assumptions it rests on.

## The contract

Before planning, present one compact message the user can check line by line:

- **Goal and scope** — what changes, for which surface (this harness instance,
  a workspace bundle, a preset, a client plugin).
- **Confirmed decisions** — one line each, in the user's words where possible.
- **Rejected options** — what was considered and why it lost.
- **Assumptions** — what you inferred and did not ask.
- **Acceptance** — how the user will see that it works on the real surface.
- **Out of scope** — what this iteration deliberately does not touch.

Keep the contract in the session unless the user asks for a file; do not create
bookkeeping documents on your own. After approval, `todo_write` tracks the
implementation steps; do not create a goal unless the user wants cross-turn
continuation.

## Then plan and implement

Submit the plan through `exit_plan_mode` with the contract plus:

- implementation steps grouped by subsystem, with the files each touches;
- public configuration or YAML shape changes and their defaults;
- verification: which command, which page, which symptom proves it works;
- rollback: how to undo it without hunting for the edit.

After approval, implement exactly that plan and verify on the real surface:

- a bundle or plugin change: install it, then read the live Loader entries and
  confirm the new rows are present and healthy;
- a Web UI change: rebuild what the change needs, refresh the page, confirm;
- a preset or composition change: start a new task under it and read the
  composed tools/prompt, not only the YAML.

Report what changed, what was verified, and what remains unverified. A scope
change needs a new alignment round, never a quiet addition.

## DSH-specific orientation

Facts you can read instead of asking:

- Presets are ordinary plugin rows: `@deepseek-ai/dsh-agent-preset` with
  `config.id/name/description/order/plugins`. A new mode is a bundle patch that
  inserts such a row; the profile patch may override it by entry id.
- A profile bundle is a package with `dsh.bundle.patch` pointing at a
  `cordis.patch.yml`; installing it is `plugin_manager install_bundle` with a
  `link:` path for a workspace package.
- Live configuration and capabilities are readable with `cordis_inspect_*`
  (`Config.listConfigs`, `Tool.listTools`, `Service.listService`).
- Skills mount from `<project>/.dsh/skills`, `<project>/.agents/skills`,
  `customSkillDirs`, `~/.dsh/skills`, and `~/.agents/skills`.
- Read the package READMEs under the DSH checkout before authoring a plugin:
  `cordis-plugin-development`, `editing-cordis-compositions`, and
  `cordis-composition-reference` cover the dialects and the shipped packages.
