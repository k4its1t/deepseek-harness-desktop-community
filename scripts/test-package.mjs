import { readdir, mkdtemp, rm, stat } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const execute = promisify(execFile)
let installation
let executable
try {
  if (process.platform === 'win32') {
    installation = await mkdtemp(join(tmpdir(), 'desktop-install-'))
    const installer = resolve('release/DeepSeek-Harness-Desktop-win-x64.exe')
    console.log(`Installing Windows package into ${installation}`)
    const progress = setInterval(() => {
      readdir(installation).then(files => console.log(`Installation still running; root entries: ${files.join(', ')}`)).catch(error => console.log(`Installation progress: ${error.message}`))
    }, 30_000)
    try {
      // The bundled runtime contains many small files; extraction on CI can
      // exceed the application startup timeout. Installation has its own bound.
      await execute(installer, ['/S', `/D=${installation}`], { windowsHide: true, windowsVerbatimArguments: true, timeout: 600_000 })
    } catch (error) {
      const diagnostics = await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Get-Process | Where-Object { $_.ProcessName -match "DeepSeek|setup|powershell" } | Select-Object Id,ProcessName,MainWindowTitle | Format-Table -AutoSize'], { windowsHide: true, timeout: 15_000 }).catch(() => null)
      if (diagnostics) console.error(diagnostics.stdout)
      throw error
    } finally {
      clearInterval(progress)
    }
    console.log('Windows installer completed')
    executable = join(installation, 'DeepSeek Harness Desktop.exe')
  } else {
    const folders = await readdir('release')
    const folder = folders.find(name => name === (process.arch === 'arm64' ? 'mac-arm64' : 'mac'))
    if (!folder) throw new Error('Packaged macOS directory is missing')
    executable = resolve('release', folder, 'DeepSeek Harness Desktop.app/Contents/MacOS/DeepSeek Harness Desktop')
  }
  await stat(executable)
  for (const args of [ ['scripts/smoke-desktop.mjs', executable], ['scripts/e2e-desktop.mjs', executable], ['scripts/e2e-desktop.mjs', executable, '--migration'] ]) {
    const result = await execute(process.execPath, args, { timeout: 240_000, maxBuffer: 4 * 1024 * 1024 })
    console.log(result.stdout)
  }
  console.log('PACKAGE_ACCEPTANCE_OK')
} finally {
  if (installation) {
    const files = await readdir(installation)
    const uninstall = files.find(name => /^Uninstall.*\.exe$/i.test(name))
    if (uninstall) await execute(join(installation, uninstall), ['/S'], { windowsHide: true, timeout: 60_000 })
    await rm(installation, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 })
  }
}
