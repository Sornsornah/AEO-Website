// Pure-Node patcher. Required because `patch` is not in the minimal Alpine
// build image and pnpm's native `patchedDependencies` lives in
// pnpm-workspace.yaml, which the Dockerfile's deps stage does not copy.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const NM = join(__dirname, '..', 'node_modules')

if (!existsSync(NM)) process.exit(0)

const fixes = [
  {
    pkg: '@tiptap/pm',
    version: '3.23.4',
    file: 'dist/state/index.js',
    expected: 'export * from "prosemirror-state";',
    replacement:
      'export { AllSelection, EditorState, NodeSelection, Plugin, PluginKey, Selection, SelectionRange, TextSelection, Transaction } from "prosemirror-state";',
  },
]

function findPackageDirs(pkg, version) {
  const dirs = []
  const flat = join(NM, pkg)
  if (existsSync(flat)) dirs.push(flat)
  const pnpmRoot = join(NM, '.pnpm')
  if (existsSync(pnpmRoot)) {
    const prefix = `${pkg.replace('/', '+')}@${version}`
    for (const d of readdirSync(pnpmRoot)) {
      if (d === prefix || d.startsWith(prefix + '_')) {
        const p = join(pnpmRoot, d, 'node_modules', pkg)
        if (existsSync(p) && !dirs.includes(p)) dirs.push(p)
      }
    }
  }
  return dirs
}

for (const fix of fixes) {
  const targets = findPackageDirs(fix.pkg, fix.version)
  if (targets.length === 0) {
    console.warn(`[apply-patches] no install found for ${fix.pkg}@${fix.version}`)
    continue
  }
  for (const dir of targets) {
    const path = join(dir, fix.file)
    if (!existsSync(path)) continue
    const current = readFileSync(path, 'utf8')
    if (current.includes(fix.replacement)) {
      continue
    }
    if (!current.includes(fix.expected)) {
      console.error(
        `[apply-patches] ${fix.pkg}@${fix.version} ${fix.file}: expected source not found — refusing to patch`,
      )
      process.exit(1)
    }
    writeFileSync(path, current.replace(fix.expected, fix.replacement))
    console.log(`[apply-patches] patched ${path}`)
  }
}
