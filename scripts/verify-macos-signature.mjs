import { execFile } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

async function findApplications(directory) {
  const applications = []

  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue

      const path = resolve(current, entry.name)
      if (entry.name.endsWith('.app')) {
        applications.push(path)
      } else {
        await visit(path)
      }
    }
  }

  await visit(directory)
  return applications
}

async function main() {
  if (process.platform !== 'darwin') {
    throw new Error('macOS signature verification must run on macOS')
  }

  const requestedPaths = process.argv.slice(2).map(path => resolve(path))
  const applications = requestedPaths.length > 0 ? requestedPaths : await findApplications(resolve('release'))
  if (applications.length === 0) {
    throw new Error('no .app bundle found under release/')
  }

  for (const application of applications) {
    await execFileAsync('/usr/bin/codesign', [
      '--verify',
      '--deep',
      '--strict',
      '--verbose=2',
      application,
    ])
    console.log(`MACOS_SIGNATURE_OK ${application}`)
  }
}

await main()
