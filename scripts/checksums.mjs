import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const directory = resolve(process.argv[2] || 'release')
const files = (await readdir(directory)).filter(name => /\.(dmg|zip|exe)$/.test(name)).sort()
if (!files.length) throw new Error('No release artifacts found')
const lines = []
for (const name of files) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(join(directory, name))) hash.update(chunk)
  lines.push(`${hash.digest('hex')}  ${name}`)
}
await writeFile(join(directory, 'SHA256SUMS'), lines.join('\n') + '\n')
console.log(`SHA256SUMS: ${files.length} artifacts`)
