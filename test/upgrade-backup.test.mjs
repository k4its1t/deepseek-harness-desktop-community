import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, stat, symlink, readlink, cp, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { inspectUpgrade, backupUpgrade, recordFreshInstall } from '../src/upgrade-backup.mjs'

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-backup-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  return { dshHome: join(root, '中文 data'), stateDirectory: join(root, 'desktop'),
    backupRoot: join(root, 'backups'), runtimeVersion: '0.1.5-rc.1' }
}

test('fresh data needs no backup', async t => {
  const options = await fixture(t)
  assert.equal((await inspectUpgrade(options)).required, false)
  await mkdir(options.dshHome)
  assert.equal((await inspectUpgrade(options)).required, false)
})

test('successful fresh startup is recorded so relaunch does not request an upgrade', async t => {
  const options = await fixture(t)
  assert.equal((await inspectUpgrade(options)).fresh, true)
  await mkdir(options.dshHome)
  await writeFile(join(options.dshHome, 'settings.yaml'), 'created by first startup')
  await recordFreshInstall(options)
  assert.equal((await inspectUpgrade(options)).required, false)
})

test('restoring a different data directory at the same path requires a new backup', async t => {
  const options = await fixture(t)
  await mkdir(options.dshHome)
  await writeFile(join(options.dshHome, 'settings.yaml'), 'first dataset')
  await backupUpgrade(await inspectUpgrade(options), options)
  await rename(options.dshHome, `${options.dshHome}-previous`)
  await mkdir(options.dshHome)
  await writeFile(join(options.dshHome, 'settings.yaml'), 'restored dataset')
  assert.equal((await inspectUpgrade(options)).required, true)
})

test('backup protects credentials and sessions, excludes dependencies, and is repeatable', async t => {
  const options = await fixture(t)
  await mkdir(join(options.dshHome, 'sessions'), { recursive: true })
  await mkdir(join(options.dshHome, 'node_modules'))
  await writeFile(join(options.dshHome, '.credentials.yaml'), 'test-only-secret')
  await writeFile(join(options.dshHome, 'sessions', 'session.jsonl'), 'test-history')
  await writeFile(join(options.dshHome, 'node_modules', 'cache'), 'rebuildable')
  const original = await stat(join(options.dshHome, '.credentials.yaml'))
  const plan = await inspectUpgrade(options)
  const backup = await backupUpgrade(plan, options)
  assert.equal(await readFile(join(backup, 'data', '.credentials.yaml'), 'utf8'), 'test-only-secret')
  assert.equal(await readFile(join(backup, 'data', 'sessions', 'session.jsonl'), 'utf8'), 'test-history')
  await assert.rejects(stat(join(backup, 'data', 'node_modules')), { code: 'ENOENT' })
  assert.equal((await stat(join(options.dshHome, '.credentials.yaml'))).mtimeMs, original.mtimeMs)
  assert.equal((await inspectUpgrade(options)).required, false)
  assert.equal((await inspectUpgrade({ ...options, runtimeVersion: 'future' })).required, true)
  if (process.platform !== 'win32') assert.equal((await stat(backup)).mode & 0o777, 0o700)
})

test('copy failure never writes a successful receipt and leaves source intact', async t => {
  const options = await fixture(t)
  await mkdir(options.dshHome)
  await writeFile(join(options.dshHome, 'settings.yaml'), 'existing')
  const plan = await inspectUpgrade(options)
  await assert.rejects(backupUpgrade(plan, { ...options, copy: async () => { throw new Error('ENOSPC') } }), /ENOSPC/)
  assert.equal((await inspectUpgrade(options)).required, true)
  assert.equal(await readFile(join(options.dshHome, 'settings.yaml'), 'utf8'), 'existing')
  await assert.rejects(stat(plan.receipt), { code: 'ENOENT' })
})

test('changing data during copying prevents a successful receipt', async t => {
  const options = await fixture(t)
  await mkdir(options.dshHome)
  await writeFile(join(options.dshHome, 'settings.yaml'), 'before')
  const plan = await inspectUpgrade(options)
  await assert.rejects(backupUpgrade(plan, { ...options, copy: async (...args) => {
    await cp(...args)
    await writeFile(join(options.dshHome, 'settings.yaml'), 'changed by other process')
  } }), /changed during backup/)
  assert.equal((await inspectUpgrade(options)).required, true)
})

test('symlinks are preserved without copying external content', { skip: process.platform === 'win32' }, async t => {
  const options = await fixture(t)
  await mkdir(options.dshHome)
  const external = join(options.stateDirectory, 'external')
  await mkdir(external, { recursive: true })
  await writeFile(join(external, 'private'), 'outside')
  await symlink(external, join(options.dshHome, 'linked-skills'))
  const backup = await backupUpgrade(await inspectUpgrade(options), options)
  assert.equal(await readlink(join(backup, 'data', 'linked-skills')), external)
  assert.deepEqual(await readdir(join(backup, 'data')), ['linked-skills'])
})

test('a backup inside DSH_HOME is rejected', async t => {
  const options = await fixture(t)
  await mkdir(options.dshHome)
  await writeFile(join(options.dshHome, 'settings.yaml'), 'existing')
  const plan = await inspectUpgrade(options)
  await assert.rejects(backupUpgrade(plan, { backupRoot: options.dshHome }), /outside/)
})
