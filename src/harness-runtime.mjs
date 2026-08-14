import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { join } from 'node:path'

const STARTUP_TIMEOUT_MS = 30_000
const SHUTDOWN_TIMEOUT_MS = 5_000

/**
 * Resolve the dedicated production runtime. Keeping it under extraResources
 * prevents electron-builder from pruning packages loaded dynamically by the
 * Harness profile system, and gives DSH_HOME's module-fallback symlinks a real
 * filesystem target outside app.asar.
 */
export function bundledDshBin({ appPath, resourcesPath, isPackaged }) {
  const runtimeRoot = isPackaged ? join(resourcesPath, 'runtime') : join(appPath, 'runtime')
  return join(runtimeRoot, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
}

/** Accept only the exact loopback URL printed by `dsh web`. */
export function parseDshWebUrl(line) {
  const match = /^dsh web:\s+(https?:\/\/[^\s]+)\s*$/.exec(line)
  if (!match) return undefined

  let parsed
  try {
    parsed = new URL(match[1])
  } catch {
    return undefined
  }

  if (parsed.protocol !== 'http:') return undefined
  if (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost' && parsed.hostname !== '::1') {
    return undefined
  }
  if (!parsed.port) return undefined
  return parsed.href
}

/** Preserve partial lines when child-process chunks split the startup URL. */
export function createLineReader(onLine) {
  let pending = ''
  return {
    push(chunk) {
      pending += chunk.toString('utf8')
      const lines = pending.split(/\r?\n/)
      pending = lines.pop() ?? ''
      for (const line of lines) onLine(line)
    },
    flush() {
      if (pending.length > 0) onLine(pending)
      pending = ''
    },
  }
}

/**
 * Owns the child dsh Web runtime. Electron is re-used as a Node executable so
 * the installed desktop app does not require a separate system Node.js.
 */
export class HarnessRuntime extends EventEmitter {
  constructor({ executable, dshBin, dshHome, workingDirectory, log }) {
    super()
    this.executable = executable
    this.dshBin = dshBin
    this.dshHome = dshHome
    this.workingDirectory = workingDirectory
    this.log = log
    this.child = undefined
    this.stopping = false
  }

  async start() {
    if (this.child) throw new Error('DeepSeek Harness runtime is already running')
    this.stopping = false

    const child = spawn(
      this.executable,
      ['--expose-internals', this.dshBin, 'web', '--host', '127.0.0.1', '--port', '0'],
      {
        cwd: this.workingDirectory,
        env: {
          ...process.env,
          DSH_HOME: this.dshHome,
          ELECTRON_RUN_AS_NODE: '1',
          NO_COLOR: '1',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      },
    )
    this.child = child

    return await new Promise((resolve, reject) => {
      let settled = false
      const settle = (operation) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        operation()
      }
      const timeout = setTimeout(() => {
        settle(() => reject(new Error(`DeepSeek Harness did not become ready within ${STARTUP_TIMEOUT_MS / 1000} seconds`)))
      }, STARTUP_TIMEOUT_MS)

      const stdout = createLineReader((line) => {
        this.log('info', `[dsh] ${line}`)
        const url = parseDshWebUrl(line)
        if (url) settle(() => resolve(url))
      })
      const stderr = createLineReader((line) => this.log('error', `[dsh] ${line}`))
      child.stdout.on('data', chunk => stdout.push(chunk))
      child.stderr.on('data', chunk => stderr.push(chunk))

      child.once('error', (error) => {
        settle(() => reject(new Error(`Unable to start DeepSeek Harness: ${error.message}`, { cause: error })))
      })
      child.once('exit', (code, signal) => {
        stdout.flush()
        stderr.flush()
        if (this.child === child) this.child = undefined
        const reason = signal ? `signal ${signal}` : `exit code ${String(code)}`
        if (!this.stopping) {
          settle(() => reject(new Error(`DeepSeek Harness exited before startup (${reason})`)))
          this.emit('unexpected-exit', reason)
        }
      })
    })
  }

  async stop() {
    const child = this.child
    if (!child) return
    this.stopping = true

    await new Promise((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        clearTimeout(forceTimer)
        resolve()
      }
      const forceTimer = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
        finish()
      }, SHUTDOWN_TIMEOUT_MS)
      child.once('exit', finish)
      if (!child.kill('SIGTERM')) finish()
    })

    if (this.child === child) this.child = undefined
  }
}
