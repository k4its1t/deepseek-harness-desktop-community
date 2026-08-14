import { chmod, stat } from 'node:fs/promises'
import { join } from 'node:path'

const target = process.argv[2] || `${process.platform}-${process.arch}`

// npm package extraction can strip the executable bit. Cross-building on an
// Intel Mac must fix the arm64 helper (and vice versa), not the host helper.
if (target === 'darwin-arm64' || target === 'darwin-x64') {
  const helper = join(
    import.meta.dirname,
    '..',
    'runtime',
    'node_modules',
    'node-pty',
    'prebuilds',
    target,
    'spawn-helper',
  )
  await stat(helper)
  await chmod(helper, 0o755)
}
