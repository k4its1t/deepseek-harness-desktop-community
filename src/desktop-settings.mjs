import { readFileSync, renameSync, writeFileSync } from 'node:fs'

export const DEFAULT_SETTINGS = Object.freeze({
  theme: 'system',
  zoomFactor: 1,
  diagnosticLogging: false,
  windowSize: { width: 1440, height: 920 },
})

export function normalizeSettings(value) {
  const input = value && typeof value === 'object' ? value : {}
  const size = input.windowSize
  return {
    theme: ['system', 'light', 'dark'].includes(input.theme) ? input.theme : 'system',
    zoomFactor: Number.isFinite(input.zoomFactor) && input.zoomFactor >= 0.75 && input.zoomFactor <= 2
      ? input.zoomFactor : 1,
    diagnosticLogging: input.diagnosticLogging === true,
    windowSize: {
      width: Number.isInteger(size?.width) && size.width >= 900 && size.width <= 7680 ? size.width : 1440,
      height: Number.isInteger(size?.height) && size.height >= 640 && size.height <= 4320 ? size.height : 920,
    },
  }
}

export function loadSettings(filePath) {
  try {
    return normalizeSettings(JSON.parse(readFileSync(filePath, 'utf8')))
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return normalizeSettings(null)
    throw error
  }
}

export function saveSettings(filePath, settings) {
  const temporaryPath = `${filePath}.tmp`
  writeFileSync(temporaryPath, JSON.stringify(normalizeSettings(settings), null, 2) + '\n', { mode: 0o600 })
  renameSync(temporaryPath, filePath)
}
