import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const lock = JSON.parse(await readFile(join(root, 'runtime/package-lock.json'), 'utf8'))
const rows = []
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path) continue
  const name = path.slice(path.lastIndexOf('node_modules/') + 13)
  rows.push(`| ${name} | ${entry.version} | ${String(entry.license || 'See included package license').replaceAll('|', '/')} |`)
}
rows.sort()
await writeFile(join(root, 'THIRD_PARTY_LICENSES.md'), `# Bundled runtime dependency inventory\n\nGenerated from runtime/package-lock.json by npm run notices. Original license texts and package metadata are shipped in Resources/runtime/node_modules. Legacy test fixtures are not distributed.\n\n| Package | Version | License declaration |\n| --- | --- | --- |\n${rows.join('\n')}\n`)
