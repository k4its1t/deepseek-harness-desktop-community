import { fileURLToPath } from 'node:url'

// Chromium and Node may encode the same file path differently (e.g. ~ / %7E).
// Decode with the platform URL parser, which rejects encoded path separators.
export function isSameLocalPage(target, expected, windows = process.platform === 'win32') {
  try {
    const actual = new URL(target)
    const trusted = new URL(expected)
    if (actual.protocol !== 'file:' || trusted.protocol !== 'file:' || actual.host !== trusted.host) return false
    return fileURLToPath(actual, { windows }) === fileURLToPath(trusted, { windows })
  } catch {
    return false
  }
}
