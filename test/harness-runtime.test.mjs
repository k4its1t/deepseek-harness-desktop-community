import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  bundledDshBin,
  bundledSkillsDirectory,
  bundledWebPatch,
  createLineReader,
  harnessWebArguments,
  HarnessRuntime,
  parseDshWebUrl,
} from '../src/harness-runtime.mjs'
import { resourcesDirectory } from '../scripts/after-pack.mjs'
import { builderArguments, builderEnvironment } from '../scripts/run-electron-builder.mjs'

test('runtime output stays private unless diagnostic logging is explicitly enabled', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'dsh-runtime-'))
  const bin = join(directory, 'child.mjs')
  writeFileSync(bin, `console.log('private runtime stdout'); console.error('private runtime stderr');
console.log('dsh web: http://127.0.0.1:49152'); setInterval(() => {}, 1000);`)
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  for (const diagnosticLogging of [false, true]) {
    const logs = []
    const runtime = new HarnessRuntime({ executable: process.execPath, dshBin: bin,
      dshHome: directory, bundledSkills: directory, webPatch: bin, workingDirectory: directory,
      log: (_level, message) => logs.push(message), diagnosticLogging })
    t.after(() => runtime.stop())
    assert.equal(await runtime.start(), 'http://127.0.0.1:49152/')
    await runtime.stop()
    assert.equal(runtime.child, undefined)
    if (diagnosticLogging) assert.ok(logs.some(line => line.includes('private runtime stdout')))
    else assert.deepEqual(logs, [])
  }
})

test('shutdown kills a child that ignores SIGTERM without reporting an unexpected exit', { skip: process.platform === 'win32' }, async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'dsh-runtime-stop-'))
  const bin = join(directory, 'child.mjs')
  writeFileSync(bin, `process.on('SIGTERM', () => {});
console.log('dsh web: http://127.0.0.1:49152'); setInterval(() => {}, 1000);`)
  const runtime = new HarnessRuntime({ executable: process.execPath, dshBin: bin,
    dshHome: directory, bundledSkills: directory, webPatch: bin, workingDirectory: directory,
    log: () => {} })
  t.after(async () => { await runtime.stop(); rmSync(directory, { recursive: true, force: true }) })
  let unexpected = false
  runtime.on('unexpected-exit', () => { unexpected = true })
  await runtime.start()
  const child = runtime.child
  let exited = false
  child.once('exit', () => { exited = true })
  await runtime.stop()
  assert.equal(exited, true)
  assert.equal(child.signalCode, 'SIGKILL')
  assert.equal(unexpected, false)
})

test('parses the loopback URL printed by dsh', () => {
  assert.equal(parseDshWebUrl('dsh web: http://127.0.0.1:63905'), 'http://127.0.0.1:63905/')
  assert.equal(parseDshWebUrl('dsh web: http://localhost:8080/path'), 'http://localhost:8080/path')
})

test('rejects remote, secure, malformed, and unrelated output', () => {
  assert.equal(parseDshWebUrl('dsh web: http://0.0.0.0:8080'), undefined)
  assert.equal(parseDshWebUrl('dsh web: https://127.0.0.1:8080'), undefined)
  assert.equal(parseDshWebUrl('dsh web: http://example.com:8080'), undefined)
  assert.equal(parseDshWebUrl('dsh web: not-a-url'), undefined)
  assert.equal(parseDshWebUrl('some other log line'), undefined)
})

test('line reader handles a URL split across chunks', () => {
  const lines = []
  const reader = createLineReader(line => lines.push(line))
  reader.push(Buffer.from('booting\ndsh web: http://127.'))
  reader.push(Buffer.from('0.0.1:4567\nready'))
  reader.flush()
  assert.deepEqual(lines, ['booting', 'dsh web: http://127.0.0.1:4567', 'ready'])
})

test('resolves the dedicated development runtime', () => {
  assert.equal(
    bundledDshBin({ appPath: '/repo', resourcesPath: '/unused', isPackaged: false }),
    '/repo/runtime/node_modules/@deepseek-ai/dsh/lib/bin.js',
  )
})

test('resolves the physical packaged runtime', () => {
  assert.equal(
    bundledDshBin({ appPath: '/unused/app.asar', resourcesPath: '/Applications/DSH.app/Contents/Resources', isPackaged: true }),
    '/Applications/DSH.app/Contents/Resources/runtime/node_modules/@deepseek-ai/dsh/lib/bin.js',
  )
})

test('resolves development and packaged companion skills', () => {
  assert.equal(
    bundledSkillsDirectory({ appPath: '/repo', resourcesPath: '/unused', isPackaged: false }),
    '/repo/.dsh/skills',
  )
  assert.equal(
    bundledSkillsDirectory({ appPath: '/unused/app.asar', resourcesPath: '/resources', isPackaged: true }),
    '/resources/skills',
  )
})

test('resolves the physical desktop Web overlay on macOS and Windows layouts', () => {
  assert.equal(
    bundledWebPatch({ appPath: '/repo', resourcesPath: '/unused', isPackaged: false }),
    '/repo/desktop/cordis.patch.yml',
  )
  assert.equal(
    bundledWebPatch({ appPath: '/unused/app.asar', resourcesPath: '/resources', isPackaged: true }),
    '/resources/desktop/cordis.patch.yml',
  )
})

test('pins the cross-platform browse picker before starting the Web app', () => {
  assert.deepEqual(
    harnessWebArguments({ dshBin: '/runtime/dsh/bin.js', webPatch: '/resources/desktop/cordis.patch.yml' }),
    [
      '--expose-internals',
      '/runtime/dsh/bin.js',
      '--profile',
      'web',
      '--patch',
      '/resources/desktop/cordis.patch.yml',
      '--host',
      '127.0.0.1',
      '--port',
      '0',
    ],
  )
})

test('locates packaged resources on macOS and Windows', () => {
  const appInfo = { productFilename: 'DSH Desktop' }
  assert.equal(
    resourcesDirectory({ electronPlatformName: 'darwin', appOutDir: '/out', packager: { appInfo } }),
    '/out/DSH Desktop.app/Contents/Resources',
  )
  assert.equal(
    resourcesDirectory({ electronPlatformName: 'win32', appOutDir: '/out', packager: { appInfo } }),
    '/out/resources',
  )
})

test('adds complete ad-hoc signing to certificate-free macOS builds', () => {
  assert.deepEqual(
    builderArguments({ platform: 'darwin', env: {}, args: ['--mac', 'dmg', '--arm64'] }),
    ['--mac', 'dmg', '--arm64', '--config.mac.identity=-'],
  )
})

test('does not override configured Developer ID or explicit signing identities', () => {
  assert.deepEqual(
    builderArguments({ platform: 'darwin', env: { CSC_LINK: 'certificate' }, args: ['--mac', 'dir'] }),
    ['--mac', 'dir'],
  )
  assert.deepEqual(
    builderArguments({
      platform: 'darwin',
      env: {},
      args: ['--mac', 'dir', '--config.mac.identity=Developer ID Application: Example'],
    }),
    ['--mac', 'dir', '--config.mac.identity=Developer ID Application: Example'],
  )
})

test('does not add a macOS identity to Windows builds', () => {
  assert.deepEqual(
    builderArguments({ platform: 'win32', env: {}, args: ['--win', 'nsis', '--x64'] }),
    ['--win', 'nsis', '--x64'],
  )
})

test('allows only credential-free ad-hoc signing in pull-request builds', () => {
  const adHocEnvironment = builderEnvironment({
    env: { GITHUB_EVENT_NAME: 'pull_request', CSC_LINK: '', APPLE_ID: '' },
    args: ['--config.mac.identity=-'],
  })
  assert.equal(adHocEnvironment.CSC_FOR_PULL_REQUEST, 'true')
  assert.equal(adHocEnvironment.CSC_LINK, undefined)
  assert.equal(adHocEnvironment.APPLE_ID, undefined)
  assert.equal(
    builderEnvironment({ env: { CSC_LINK: 'certificate' }, args: ['--mac', 'dir'] })
      .CSC_FOR_PULL_REQUEST,
    undefined,
  )
})
