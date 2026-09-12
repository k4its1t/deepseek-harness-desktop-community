import { createHash } from 'node:crypto'
import { cp, mkdir, readdir, lstat, readFile, realpath, rename, writeFile, chmod } from 'node:fs/promises'
import { join, relative, isAbsolute, resolve, sep } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execute = promisify(execFile)
const excluded = new Set(['node_modules', '.cache'])

async function privateDirectory(path) {
  await mkdir(path, { recursive: true, mode: 0o700 })
  if (process.platform === 'win32') {
    const { stdout } = await execute('whoami.exe', ['/user', '/fo', 'csv', '/nh'], { windowsHide: true })
    const sid = stdout.match(/S-1-[0-9-]+/)?.[0]
    if (!sid) throw new Error('Cannot determine the Windows account for private backup permissions')
    await execute('icacls.exe', [path, '/grant:r', `*${sid}:(OI)(CI)F`, '/inheritance:r'], { windowsHide: true })
  } else await chmod(path, 0o700)
}

async function inventory(root, path = root) {
  const entries = []
  for (const name of (await readdir(path)).sort()) {
    if (excluded.has(name)) continue
    const file = join(path, name)
    const info = await lstat(file)
    entries.push([relative(root, file), info.size, info.mtimeMs, info.isSymbolicLink()])
    if (info.isDirectory()) entries.push(...await inventory(root, file))
  }
  return entries
}

/** A receipt belongs to one canonical data directory and one exact runtime. */
export async function inspectUpgrade({ dshHome, stateDirectory, runtimeVersion }) {
  let source
  try { source = await realpath(dshHome) } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return { required: false, fresh: true }
  }
  const key = createHash('sha256').update(source).update('\0').update(runtimeVersion).digest('hex')
  const receipt = join(stateDirectory, 'upgrades', `${key}.json`)
  try {
    const saved = JSON.parse(await readFile(receipt, 'utf8'))
    if (saved.complete && saved.source === source && saved.runtimeVersion === runtimeVersion) {
      return { required: false, backup: saved.backup }
    }
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error
  }
  const entries = await inventory(source)
  return { required: entries.length > 0, fresh: entries.length === 0, source, receipt, runtimeVersion, entries }
}

export async function recordFreshInstall(options) {
  const plan = await inspectUpgrade(options)
  if (!plan.receipt) return
  await privateDirectory(join(plan.receipt, '..'))
  await writeFile(`${plan.receipt}.tmp`, JSON.stringify({ complete: true, source: plan.source, runtimeVersion: options.runtimeVersion, freshInstall: true }), { mode: 0o600 })
  await rename(`${plan.receipt}.tmp`, plan.receipt)
}

/** Never modify the source or follow symlinks into data outside DSH_HOME. */
export async function backupUpgrade(plan, { backupRoot, copy = cp } = {}) {
  if (!plan.required) return undefined
  const lexical = relative(plan.source, resolve(backupRoot))
  if (!lexical || (lexical !== '..' && !lexical.startsWith(`..${sep}`) && !isAbsolute(lexical))) {
    throw new Error('The backup location must be outside the Harness data directory')
  }
  await privateDirectory(backupRoot)
  const root = await realpath(backupRoot)
  const relation = relative(plan.source, root)
  if (!relation || (relation !== '..' && !relation.startsWith(`..${sep}`) && !isAbsolute(relation))) {
    throw new Error('The backup location must be outside the Harness data directory')
  }
  const backup = join(root, `${new Date().toISOString().replace(/[:.]/g, '-')}-${plan.runtimeVersion}-${createHash('sha256').update(plan.source).digest('hex').slice(0, 8)}`)
  await privateDirectory(backup)
  const before = JSON.stringify(await inventory(plan.source))
  await copy(plan.source, join(backup, 'data'), {
    recursive: true, dereference: false, verbatimSymlinks: true, preserveTimestamps: true,
    filter: path => !relative(plan.source, path).split(/[\\/]/).some(part => excluded.has(part)),
  })
  if (before !== JSON.stringify(await inventory(plan.source))) {
    throw new Error(`Harness data changed during backup. Close other Harness processes and retry. Incomplete backup: ${backup}`)
  }
  const result = { complete: true, source: plan.source, runtimeVersion: plan.runtimeVersion, backup, createdAt: new Date().toISOString() }
  await writeFile(join(backup, 'manifest.json'), JSON.stringify(result, null, 2), { mode: 0o600 })
  const receiptDirectory = join(plan.receipt, '..')
  await privateDirectory(receiptDirectory)
  await writeFile(`${plan.receipt}.tmp`, JSON.stringify(result, null, 2), { mode: 0o600 })
  await rename(`${plan.receipt}.tmp`, plan.receipt)
  return backup
}
