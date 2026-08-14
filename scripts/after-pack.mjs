import { cp, mkdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

export function resourcesDirectory(context) {
  if (context.electronPlatformName === 'darwin') {
    return join(
      context.appOutDir,
      `${context.packager.appInfo.productFilename}.app`,
      'Contents',
      'Resources',
    )
  }
  return join(context.appOutDir, 'resources')
}

/**
 * electron-builder deliberately excludes node_modules from generic resource
 * file sets. Harness profiles import plugins dynamically, so their complete
 * npm production tree is copied after the normal app archive is assembled.
 */
export default async function afterPack(context) {
  const source = join(context.packager.projectDir, 'runtime', 'node_modules')
  await stat(join(source, '@deepseek-ai', 'dsh', 'lib', 'bin.js'))

  const target = join(resourcesDirectory(context), 'runtime', 'node_modules')
  await mkdir(target, { recursive: true })
  await cp(source, target, {
    recursive: true,
    dereference: false,
    preserveTimestamps: true,
  })
}
