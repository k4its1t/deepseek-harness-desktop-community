import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { loadSettings, normalizeSettings, saveSettings } from '../src/desktop-settings.mjs'
import { isSameLocalPage } from '../src/local-page.mjs'

test('recovery page accepts equivalent file encodings without trusting other pages', () => {
  for (const windows of [false, true]) {
    const expected = 'file:///C:/Users/RUNNER%7E1/中文%20目录/loading.html'
    assert.equal(isSameLocalPage('file:///C:/Users/RUNNER~1/%E4%B8%AD%E6%96%87%20%E7%9B%AE%E5%BD%95/loading.html?status=error', expected, windows), true)
    for (const target of [expected.replace('loading.html', 'other.html'), expected.replace('file:', 'https:'), expected.replace('file:///', 'file://untrusted/'), expected.replace('/loading.html', '%2Floading.html'), 'invalid']) {
      assert.equal(isSameLocalPage(target, expected, windows), false, target)
    }
  }
})

test('desktop preferences survive relaunch without storing unrelated fields', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'dsh-settings-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const path = join(directory, 'desktop-settings.json')
  const preferences = { theme: 'dark', zoomFactor: 1.2, diagnosticLogging: true, windowSize: { width: 1200, height: 800 } }
  saveSettings(path, { ...preferences, apiKey: 'not-a-real-key' })
  assert.deepEqual(loadSettings(path), preferences)
  assert.equal(readFileSync(path, 'utf8').includes('apiKey'), false)
})

test('missing or malformed preferences recover safe usable defaults', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'dsh-settings-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const path = join(directory, 'desktop-settings.json')
  const defaults = normalizeSettings(null)
  assert.deepEqual(loadSettings(path), defaults)
  writeFileSync(path, '{broken json')
  assert.deepEqual(loadSettings(path), defaults)
  assert.deepEqual(normalizeSettings({ theme: 'unknown', zoomFactor: Infinity, diagnosticLogging: 'true', windowSize: { width: -1, height: 999999 } }), defaults)
})
