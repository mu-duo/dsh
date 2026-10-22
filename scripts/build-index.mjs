#!/usr/bin/env node
/**
 * Regenerate `market/index.json` from `scripts/plugins.mjs`, the packages'
 * `package.json` files, and the release log in `market/releases.json`.
 *
 * The index is format 1 of the DSH plugin market index. Icons are inlined as
 * data URLs because GitHub Pages serves only the `market/` directory.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { plugins } from './plugins.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPOSITORY = 'https://github.com/tanlinfeng/dsh-plugins'
const INDEX_PATH = path.join(ROOT, 'market', 'index.json')
const RELEASES_PATH = path.join(ROOT, 'market', 'releases.json')

const releases = existsSync(RELEASES_PATH)
  ? JSON.parse(readFileSync(RELEASES_PATH, 'utf8'))
  : {}

function iconDataUrl(relativePath) {
  if (relativePath === null) return undefined
  const file = path.join(ROOT, relativePath)
  if (!existsSync(file)) throw new Error(`icon not found: ${relativePath}`)
  const type = relativePath.endsWith('.svg') ? 'image/svg+xml' : 'image/png'
  return `data:${type};base64,${readFileSync(file).toString('base64')}`
}

const entries = []
for (const plugin of plugins) {
  const manifestPath = path.join(ROOT, plugin.dir, 'package.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const published = releases[manifest.name] ?? {}
  const versions = Object.entries(published)
    .map(([version, publishTimestamp]) => ({
      version,
      publishTimestamp,
      source: { type: 'npm' },
      ...(manifest.engines?.dsh === undefined ? {} : { engines: { dsh: manifest.engines.dsh } }),
    }))
    .sort((left, right) => right.publishTimestamp - left.publishTimestamp)

  if (versions.length === 0) continue

  const icon = iconDataUrl(plugin.icon)
  entries.push({
    name: manifest.name,
    title: plugin.title,
    description: plugin.description,
    ...(icon === undefined ? {} : { icon }),
    author: 'tanlinfeng',
    homepage: `${REPOSITORY}/tree/main/${plugin.dir}`,
    repository: { url: REPOSITORY, directory: plugin.dir },
    metadata: { category: plugin.category, keywords: plugin.keywords },
    versions,
  })
}

const index = {
  format: 1,
  title: {
    en: 'tanlinfeng DSH plugins',
    zh: 'tanlinfeng 的 DSH 插件',
  },
  description: {
    en: 'Sidebar, task and agent-orchestration plugins for DeepSeek Harness.',
    zh: '供 DeepSeek Harness 使用的侧栏、任务与智能体编排插件。',
  },
  metadata: {
    categories: {
      ui: { title: { en: 'Interface', zh: '界面' } },
      agents: { title: { en: 'Agents', zh: '智能体' } },
    },
  },
  plugins: entries,
}

writeFileSync(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`)
console.log(`market/index.json: ${String(entries.length)} plugin(s), ${String(entries.reduce((sum, entry) => sum + entry.versions.length, 0))} version(s)`)
