// Isolated test host for the exact runtime shipped in desktop v0.3.2.
import { app, BrowserWindow } from 'electron'
import { spawn } from 'node:child_process'
import { join, resolve } from 'node:path'
import { createLineReader } from '../src/harness-runtime.mjs'

if (!process.env.DSH_DESKTOP_TEST_ROOT || !process.env.DSH_HOME) throw new Error('Isolated test paths are required')
app.setPath('userData', join(process.env.DSH_DESKTOP_TEST_ROOT, 'legacy-electron'))
let child
let quitting = false
app.whenReady().then(() => {
const window = new BrowserWindow({ show: true, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } })
child = spawn(process.execPath, ['--expose-internals', resolve('test/fixtures/legacy-runtime/node_modules/@deepseek-ai/dsh/lib/bin.js'),
  '--profile', 'web', '--patch', resolve('desktop/cordis.patch.yml'), '--host', '127.0.0.1', '--port', '0'], {
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, cwd: process.env.DSH_DESKTOP_TEST_ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
})
const reader = createLineReader(line => {
  const match = /^dsh web: (http:\/\/127\.0\.0\.1:\d+\S*)$/.exec(line)
  if (match) void window.loadURL(match[1])
})
child.stdout.on('data', chunk => reader.push(chunk))
child.stderr.on('data', chunk => console.error(String(chunk)))
app.on('before-quit', event => {
  if (quitting) return
  event.preventDefault()
  quitting = true
  child.once('exit', () => app.quit())
  child.kill('SIGTERM')
})
})
