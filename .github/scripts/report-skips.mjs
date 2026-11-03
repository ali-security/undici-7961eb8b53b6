// Prints every test-skip declaration in the suite together with its reason, so a
// CI log that reports "skipped N" also names each skipped test and why it skips.
// Read-only: it runs after the test step and never changes a test outcome.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()

function walk (dir, filter, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name === 'fixtures' || name === 'node_modules') continue
      walk(p, filter, out)
    } else if (filter(p)) {
      out.push(p)
    }
  }
  return out
}

console.log('=== node:test / borp skip declarations (file:line: declaration — the skip condition is the reason) ===')
const testFiles = walk(join(root, 'test'), (p) => /\.(m?js)$/.test(p) && !p.includes(join('test', 'wpt')))
for (const file of testFiles) {
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    if (/\bskip\b|\.skip\(/.test(line)) {
      console.log(`${relative(root, file)}:${i + 1}: ${line.trim()}`)
    }
  })
}

console.log('\n=== WPT skips (test/wpt/status/*.status.json: path — reason) ===')
function visit (node, path, file) {
  if (node === null || typeof node !== 'object' || Array.isArray(node)) return
  if (node.skip === true) {
    const reason = node.note || node['//'] || 'marked skip in the upstream WPT status file (not implemented / not applicable to Node.js)'
    console.log(`${file}: ${path.join('/') || '(whole folder)'} — ${reason}`)
  }
  for (const [k, v] of Object.entries(node)) visit(v, [...path, k], file)
}
const statusFiles = walk(join(root, 'test', 'wpt', 'status'), (p) => p.endsWith('.status.json'))
for (const file of statusFiles) {
  visit(JSON.parse(readFileSync(file, 'utf8')), [], relative(root, file))
}
