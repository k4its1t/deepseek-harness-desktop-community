import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectDirectory = dirname(scriptDirectory)

function targetsMac(platform, args) {
  if (args.some(argument => argument === '--mac' || argument.startsWith('--mac='))) {
    return true
  }

  const targetsAnotherPlatform = args.some(
    argument =>
      argument === '--win' ||
      argument.startsWith('--win=') ||
      argument === '--linux' ||
      argument.startsWith('--linux='),
  )
  return platform === 'darwin' && !targetsAnotherPlatform
}

function hasIdentityOverride(args) {
  return args.some(
    (argument, index) =>
      argument.startsWith('--config.mac.identity=') ||
      (argument === '--config.mac.identity' && index < args.length - 1),
  )
}

/**
 * GitHub community builds have no Apple certificate. Explicit ad-hoc signing
 * makes electron-builder recursively sign the complete app bundle instead of
 * leaving Electron's incomplete linker signature in place. A configured
 * Developer ID identity always takes precedence.
 */
export function builderArguments({ platform, env, args }) {
  const result = [...args]
  const hasDeveloperIdentity = Boolean(env.CSC_LINK || env.CSC_NAME)

  if (targetsMac(platform, result) && !hasDeveloperIdentity && !hasIdentityOverride(result)) {
    result.push('--config.mac.identity=-')
  }

  return result
}

export function builderEnvironment({ env, args }) {
  const result = { ...env }
  if (args.includes('--config.mac.identity=-')) {
    // electron-builder otherwise skips even credential-free ad-hoc signing in
    // pull-request builds. This flag is never added to Developer ID builds.
    result.CSC_FOR_PULL_REQUEST = 'true'
  }
  return result
}

async function main() {
  const cliPath = join(projectDirectory, 'node_modules', 'electron-builder', 'cli.js')
  if (!existsSync(cliPath)) {
    throw new Error('electron-builder is not installed; run npm ci first')
  }

  const originalArguments = process.argv.slice(2)
  const argumentsForBuilder = builderArguments({
    platform: process.platform,
    env: process.env,
    args: originalArguments,
  })
  const environmentForBuilder = builderEnvironment({
    env: process.env,
    args: argumentsForBuilder,
  })

  if (
    process.platform === 'darwin' &&
    !originalArguments.includes('--config.mac.identity=-') &&
    argumentsForBuilder.includes('--config.mac.identity=-')
  ) {
    console.log('macOS Developer ID not configured; using a complete ad-hoc app signature')
  }

  const child = spawn(process.execPath, [cliPath, ...argumentsForBuilder], {
    cwd: projectDirectory,
    env: environmentForBuilder,
    stdio: 'inherit',
  })

  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', code => resolve(code ?? 1))
  })
  process.exitCode = exitCode
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main()
}
