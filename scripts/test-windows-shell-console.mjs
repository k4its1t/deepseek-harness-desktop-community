import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import electron from 'electron'

const root = mkdtempSync(join(tmpdir(), 'desktop-shell-console-'))
const workspace = join(root, 'workspace')
const temp = join(root, 'temp')
mkdirSync(workspace)
mkdirSync(temp)
const args = [resolve('runtime/node_modules/@deepseek-ai/dsh-sandbox-windows-acl/lib/runner.js'),
  '--workspace', workspace, '--temp', temp, '--mode', 'workspace-write', '--',
  join(process.env.ProgramFiles, 'PowerShell', '7', 'pwsh.exe'),
  '-NoLogo', '-NoProfile', '-NonInteractive', '-Command', 'echo DESKTOP_TOOL_OK']
try {
  for (const [name, executable, windowsHide] of [
    ['node-console', process.execPath, false],
    ['electron-console', electron, false],
    ['electron-hidden', electron, true],
  ]) {
    const result = spawnSync(executable, args, {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      encoding: 'utf8', timeout: 30000, windowsHide,
    })
    assert.equal(result.status, 0, `${name}: ${result.error?.message ?? ''} ${result.stderr}`)
    assert.match(result.stdout, /DESKTOP_TOOL_OK/, `${name}: missing real shell output`)
    console.log(`${name}: passed`)
  }
} finally {
  rmSync(root, { recursive: true, force: true })
}
