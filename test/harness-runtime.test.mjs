import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  bundledDshBin,
  bundledSkillsDirectory,
  createLineReader,
  parseDshWebUrl,
} from '../src/harness-runtime.mjs'
import { resourcesDirectory } from '../scripts/after-pack.mjs'

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
