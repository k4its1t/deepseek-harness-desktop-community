import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import electron from 'electron'

const root = await mkdtemp(join(tmpdir(), 'desktop-smoke-'))
const executable = process.argv[2] ? resolve(process.argv[2]) : electron
const args = [...(process.argv[2] ? [] : ['.']), '--smoke-test']
const env = { ...process.env, DSH_HOME: join(root, 'dsh'), DSH_AGENTS_HOME: join(root, 'agents'),
  DSH_DESKTOP_TEST_ROOT: root, DSH_TELEMETRY_MODE: 'DISABLED' }
delete env.ELECTRON_RUN_AS_NODE
// No real credentials or provider endpoints are needed by this test.
for (const key of Object.keys(env)) if (/API_KEY|BASE_URL/.test(key)) delete env[key]
let output = ''
const child = spawn(executable, args, { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
const timer = setTimeout(() => child.kill('SIGKILL'), 90_000)
child.stdout.on('data', chunk => { output += chunk })
child.stderr.on('data', chunk => { output += chunk })
try {
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve) })
  if (code !== 0 || !output.includes('DESKTOP_SMOKE_OK')) throw new Error(`Packaged smoke failed (${code}):\n${output}`)
  console.log('DESKTOP_SMOKE_OK — isolated data, authenticated Web UI, clean exit')
} finally {
  clearTimeout(timer)
  await rm(root, { recursive: true, force: true })
}
