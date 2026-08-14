import { createRequire } from 'node:module'
import { lstat, readdir, unlink } from 'node:fs/promises'
import { dirname, extname, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const osxSignPackage = require.resolve('@electron/osx-sign/package.json')
const osxSignDirectory = dirname(osxSignPackage)
const osxSignUtilities = require(resolve(osxSignDirectory, 'dist/cjs/util.js'))
const { isBinaryFile } = require('isbinaryfile')

/**
 * @electron/osx-sign scans every file concurrently. The bundled Harness
 * runtime contains tens of thousands of files, which exceeds macOS's
 * kern.maxfilesperproc limit. This compatible sequential walker keeps the
 * signing behavior while holding only a few file descriptors at a time.
 */
export async function walkSignablePaths(directory) {
  const result = []

  async function visit(current) {
    for (const child of await readdir(current)) {
      const path = resolve(current, child)
      const metadata = await lstat(path)

      if (metadata.isSymbolicLink()) continue
      if (metadata.isDirectory()) {
        await visit(path)
        if (['.app', '.framework'].includes(extname(path))) result.push(path)
        continue
      }
      if (!metadata.isFile()) continue

      if (extname(path) === '.cstemp') {
        await unlink(path)
      } else if (await isBinaryFile(path)) {
        result.push(path)
      }
    }
  }

  await visit(directory)
  return result
}

export default async function signMacApplication(configuration) {
  if (typeof osxSignUtilities.walkAsync !== 'function') {
    throw new Error('unsupported @electron/osx-sign version: walkAsync is unavailable')
  }

  osxSignUtilities.walkAsync = walkSignablePaths
  const { signApp } = require('@electron/osx-sign')
  await signApp(configuration)
}
