# Multi-agent (`@tanlinfeng/dsh-multi-agent`)

Role-based delegation on top of the built-in subagent service
(`@deepseek-ai/dsh-subagent` + `dsh-tool-subagent`), with a right-Sidebar roster
and role settings embedded on the bundle's own Plugins page.

## What it adds

- **`delegate` tool** — one call starts a built-in `spawn` subagent for a named
  role. The role supplies the model, reasoning effort, read-only prompt
  constraint, and a parallel limit counted per parent session.
- **Right-Sidebar roster** — every descendant subagent of the current session,
  recursively, with live status, role badge, model/effort, elapsed time, a stop
  action, and two navigation actions (main conversation, right-side chat tab).
  Open it from the Sidebar guide or with `/agents`.
- **Role settings** — Plugins → Multi-agent (this bundle's page). Edit built-in
  roles, add or delete custom roles, and restore the built-in defaults.

## Built-in roles

| id | name | effort | parallel | read-only |
|---|---|---|---|---|
| `coder` | Coder | off | 2 | no |
| `fixer` | Fixer | max | 1 | no |
| `explorer` | Explorer | low | 4 | yes |
| `librarian` | Librarian | low | 4 | yes |

## Install

This repository package is installed into a profile as a local bundle, not from a
registry:

1. Add the bundle through the profile's plugin manager with the absolute package
   directory as the target (the operation writes the profile's `package.json`
   and bundle list for you):

   ```
   plugin_manager install_bundle target=/home/lftan/DSH/multi-agent-plugin
   ```

2. If the package was edited after installation, toggle the Loader row
   (`include:multi-agent`) off and on, or reinstall, so the Host half reloads.
3. Reload the browser page once to pick up the client half (the roster tab and
   the bundle-page settings are dynamic client modules).
4. Open the roster with `/agents` or the right-Sidebar guide entry, and edit
   roles under Plugins → Multi-agent.

There are no npm dependencies, build steps, or engine requirements beyond the
DSH version that ships the `dsh.bundle` / `dsh.client` package format.

## Storage

Roles are stored in `$DSH_HOME/multi-agent/roles.json` (default
`~/.dsh/multi-agent/roles.json`). The Host writes through a temp file plus
rename; the browser route is `/api/multi-agent` inside the connection auth
fence.

## Notes

- The built-in `subagent` / `subagent_fork` tools stay available; `delegate`
  adds the role dimension.
- Parallel limits are per parent session and role. Over-limit calls are
  rejected with the occupying child ids rather than queued.
- Read-only is enforced by the role prompt, not by removing tools from the
  child.
- The roster polls the Host every two seconds while the page is visible.
