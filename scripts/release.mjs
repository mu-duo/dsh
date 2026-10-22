#!/usr/bin/env node
/**
 * Publish one or more plugins to npm and refresh the market index.
 *
 *   node scripts/release.mjs todolist-plugin
 *   node scripts/release.mjs dsh-btw todolist-plugin --dry-run
 *
 * Publishing targets the public npm registry explicitly: this machine's default
 * registry is the npmmirror read-only mirror, which cannot accept a publish.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { plugins } from './plugins.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REGISTRY = 'https://registry.npmjs.org'
const RELEASES_PATH = path.join(ROOT, 'market', 'releases.json')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const dirs = args.filter((arg) => !arg.startsWith('-'))

if (dirs.length === 0) {
  console.error('usage: node scripts/release.mjs <plugin-dir>... [--dry-run]')
  console.error(`known directories: ${plugins.map((plugin) => plugin.dir).join(', ')}`)
  process.exit(1)
}

for (const dir of dirs) {
  if (!plugins.some((plugin) => plugin.dir === dir)) {
    console.error(`${dir}: not listed in scripts/plugins.mjs, so it would be missing from market/index.json`)
    process.exit(1)
  }
}

const releases = existsSync(RELEASES_PATH)
  ? JSON.parse(readFileSync(RELEASES_PATH, 'utf8'))
  : {}

for (const dir of dirs) {
  const manifest = JSON.parse(readFileSync(path.join(ROOT, dir, 'package.json'), 'utf8'))
  const { name, version } = manifest
  const already = releases[name]?.[version] !== undefined

  if (already && !dryRun) {
    console.error(`${name}@${version} is already in market/releases.json; bump the version first`)
    process.exit(1)
  }

  console.log(`\n=== ${name}@${version}${dryRun ? ' (dry run)' : ''}`)
  execFileSync(
    'npm',
    ['publish', '--access', 'public', '--registry', REGISTRY, ...(dryRun ? ['--dry-run'] : [])],
    { cwd: path.join(ROOT, dir), stdio: 'inherit' },
  )

  if (dryRun) continue

  releases[name] = releases[name] ?? {}
  releases[name][version] = Math.floor(Date.now() / 1000)
  writeFileSync(RELEASES_PATH, `${JSON.stringify(releases, null, 2)}\n`)
  execFileSync('node', ['scripts/build-index.mjs'], { cwd: ROOT, stdio: 'inherit' })
  execFileSync('git', ['tag', `${dir}-v${version}`], { cwd: ROOT, stdio: 'inherit' })
  console.log(`tagged ${dir}-v${version}`)
}

if (!dryRun) {
  console.log('\nnext: git add market && git commit -m "release" && git push --follow-tags')
}
