import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, BrowserWindow, dialog, Menu, session, shell } from 'electron'
import {
  HarnessRuntime,
  bundledDshBin,
  bundledSkillsDirectory,
} from './harness-runtime.mjs'

const APP_NAME = 'DeepSeek Harness Desktop Community'
const isSmokeTest = process.argv.includes('--smoke-test')
const openDevTools = process.argv.includes('--devtools')
const loadingPage = join(import.meta.dirname, 'loading.html')
const loadingPageUrl = pathToFileURL(loadingPage)

let mainWindow
let runtime
let allowedOrigin
let logFile
let quitting = false

app.setName(APP_NAME)

function log(level, message) {
  const row = `${new Date().toISOString()} [${level.toUpperCase()}] ${message}\n`
  if (level === 'error') console.error(message)
  else console.log(message)
  if (logFile) {
    try {
      appendFileSync(logFile, row, 'utf8')
    } catch (error) {
      console.error(`Unable to write desktop log: ${error.message}`)
    }
  }
}

function isAllowedNavigation(target) {
  try {
    const url = new URL(target)
    if (url.protocol === 'file:') return url.pathname === loadingPageUrl.pathname
    return allowedOrigin !== undefined && url.origin === allowedOrigin
  } catch {
    return false
  }
}

function openExternal(target) {
  try {
    const url = new URL(target)
    if (['https:', 'http:', 'mailto:'].includes(url.protocol)) void shell.openExternal(url.href)
  } catch {
    // Ignore malformed external links.
  }
}

async function showLoading(status = 'starting', message = '') {
  if (!mainWindow || mainWindow.isDestroyed()) return
  await mainWindow.loadFile(loadingPage, { query: { status, message } })
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 640,
    show: false,
    backgroundColor: '#0f1020',
    title: APP_NAME,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  window.once('ready-to-show', () => window.show())
  window.webContents.on('will-navigate', (event, target) => {
    if (isAllowedNavigation(target)) return
    event.preventDefault()
    openExternal(target)
  })
  window.webContents.on('will-attach-webview', event => event.preventDefault())
  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url)
    return { action: 'deny' }
  })
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = undefined
  })
  return window
}

function installMenu() {
  const dataDirectory = runtime.dshHome
  const template = [
    ...(process.platform === 'darwin' ? [{
      label: APP_NAME,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'Open DSH Data Folder', click: () => void shell.openPath(dataDirectory) },
        { label: 'Open Log Folder', click: () => void shell.openPath(app.getPath('logs')) },
        { type: 'separator' },
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        ...(openDevTools || !app.isPackaged ? [{ role: 'toggleDevTools' }] : []),
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' }, { role: 'togglefullscreen' },
      ],
    },
    { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'zoom' }] },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

async function waitForUiReady(window) {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    const ready = await window.webContents.executeJavaScript(
      'Boolean(window.__DSH_BOOT__) && Boolean(document.body) && document.body.innerText.trim().length > 0',
      true,
    )
    if (ready) return
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error('Web UI did not finish booting within 20 seconds')
}

async function boot() {
  const logsDirectory = app.getPath('logs')
  mkdirSync(logsDirectory, { recursive: true })
  logFile = join(logsDirectory, 'desktop.log')

  const dshHome = process.env.DSH_HOME?.trim() || join(app.getPath('home'), '.dsh')
  runtime = new HarnessRuntime({
    executable: process.execPath,
    dshBin: bundledDshBin({
      appPath: app.getAppPath(),
      resourcesPath: process.resourcesPath,
      isPackaged: app.isPackaged,
    }),
    dshHome,
    bundledSkills: bundledSkillsDirectory({
      appPath: app.getAppPath(),
      resourcesPath: process.resourcesPath,
      isPackaged: app.isPackaged,
    }),
    workingDirectory: app.getPath('home'),
    log,
  })
  runtime.on('unexpected-exit', (reason) => {
    if (quitting) return
    log('error', `DeepSeek Harness stopped unexpectedly: ${reason}`)
    if (isSmokeTest) {
      app.exit(1)
      return
    }
    void showLoading(
      'error',
      `DeepSeek Harness stopped unexpectedly (${reason}). See the log folder for details.`,
    ).catch(error => log('error', `Unable to show runtime failure page: ${error.message}`))
  })

  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  session.defaultSession.setPermissionCheckHandler(() => false)
  mainWindow = createWindow()
  installMenu()
  await showLoading()

  const url = await runtime.start()
  allowedOrigin = new URL(url).origin
  log('info', `Loading local Web UI from ${allowedOrigin}`)
  await mainWindow.loadURL(url)

  if (openDevTools) mainWindow.webContents.openDevTools({ mode: 'detach' })
  if (isSmokeTest) {
    await waitForUiReady(mainWindow)
    console.log('DESKTOP_SMOKE_OK')
    await runtime.stop()
    app.quit()
  }
}

const hasLock = app.requestSingleInstanceLock()
if (!hasLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })

  app.whenReady().then(boot).catch(async (error) => {
    log('error', error?.stack || String(error))
    if (!isSmokeTest) dialog.showErrorBox('Unable to start DeepSeek Harness', error?.message || String(error))
    await runtime?.stop()
    app.exit(1)
  })
}

app.on('activate', () => {
  if (!mainWindow && runtime) {
    mainWindow = createWindow()
    const loadWindow = allowedOrigin ? mainWindow.loadURL(allowedOrigin) : showLoading()
    void loadWindow.catch(error => log('error', `Unable to restore application window: ${error.message}`))
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  quitting = true
  void runtime?.stop()
})
