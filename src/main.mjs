import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, BrowserWindow, dialog, Menu, nativeTheme, screen, session, shell } from 'electron'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './desktop-settings.mjs'
import {
  HarnessRuntime,
  bundledDshBin,
  bundledSkillsDirectory,
  bundledWebPatch,
} from './harness-runtime.mjs'

const APP_NAME = 'DeepSeek Harness Desktop'
const isSmokeTest = process.argv.includes('--smoke-test')
const openDevTools = process.argv.includes('--devtools')
const loadingPage = join(import.meta.dirname, 'loading.html')
const loadingPageUrl = pathToFileURL(loadingPage)
const windowIcon = join(import.meta.dirname, '../build/icon.png')

let mainWindow
let runtime
let allowedOrigin
let logFile
let quitting = false
let shutdownComplete = false
let settings
let settingsPath

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
  const workArea = screen.getPrimaryDisplay().workAreaSize
  const window = new BrowserWindow({
    width: Math.min(settings.windowSize.width, workArea.width),
    height: Math.min(settings.windowSize.height, workArea.height),
    minWidth: 900,
    minHeight: 640,
    show: false,
    backgroundColor: '#0f1020',
    title: APP_NAME,
    icon: windowIcon,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  window.once('ready-to-show', () => window.show())
  window.webContents.on('did-finish-load', () => {
    window.webContents.setZoomFactor(settings.zoomFactor)
  })
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
  window.on('close', () => {
    const { width, height } = window.getNormalBounds()
    updateSettings({ windowSize: { width, height } })
  })
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = undefined
  })
  return window
}

function updateSettings(change) {
  settings = { ...settings, ...change }
  nativeTheme.themeSource = settings.theme
  if (runtime) runtime.diagnosticLogging = settings.diagnosticLogging
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.setZoomFactor(settings.zoomFactor)
  try {
    saveSettings(settingsPath, settings)
  } catch {
    dialog.showErrorBox('Unable to save desktop settings', 'Your changes apply for this session only. Check that the application data folder is writable.')
  }
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
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', click: () => updateSettings({ zoomFactor: 1 }) },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', click: () => updateSettings({ zoomFactor: Math.min(2, Math.round((settings.zoomFactor + 0.1) * 100) / 100) }) },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => updateSettings({ zoomFactor: Math.max(0.75, Math.round((settings.zoomFactor - 0.1) * 100) / 100) }) },
        { type: 'separator' }, { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Settings',
      submenu: [
        {
          label: 'System Appearance',
          submenu: ['system', 'light', 'dark'].map(theme => ({
            label: theme === 'system' ? 'Follow Operating System' : theme === 'light' ? 'Light' : 'Dark',
            type: 'radio',
            checked: settings.theme === theme,
            click: () => updateSettings({ theme }),
          })),
        },
        {
          label: 'Diagnostic Runtime Logging',
          type: 'checkbox',
          checked: settings.diagnosticLogging,
          click: async (item) => {
            if (item.checked) {
              const result = await dialog.showMessageBox({
                type: 'warning',
                message: 'Enable diagnostic runtime logging?',
                detail: 'Runtime output may contain private paths or conversation data. Enable it only while troubleshooting, and review logs before sharing them.',
                buttons: ['Cancel', 'Enable'], defaultId: 0, cancelId: 0,
              })
              item.checked = result.response === 1
            }
            updateSettings({ diagnosticLogging: item.checked })
          },
        },
        { type: 'separator' },
        {
          label: 'Reset Desktop Settings',
          click: () => {
            updateSettings({ ...DEFAULT_SETTINGS, windowSize: { ...DEFAULT_SETTINGS.windowSize } })
            if (mainWindow && !mainWindow.isDestroyed()) {
              const area = screen.getPrimaryDisplay().workAreaSize
              mainWindow.setSize(Math.min(1440, area.width), Math.min(920, area.height))
              mainWindow.center()
            }
            installMenu()
          },
        },
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
  if (quitting) return
  const desktopDirectory = app.getPath('userData')
  mkdirSync(desktopDirectory, { recursive: true })
  settingsPath = join(desktopDirectory, 'desktop-settings.json')
  settings = loadSettings(settingsPath)
  nativeTheme.themeSource = settings.theme
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
    webPatch: bundledWebPatch({
      appPath: app.getAppPath(),
      resourcesPath: process.resourcesPath,
      isPackaged: app.isPackaged,
    }),
    workingDirectory: app.getPath('home'),
    log,
    diagnosticLogging: settings.diagnosticLogging,
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
  if (quitting) return

  const url = await runtime.start()
  if (quitting) return
  allowedOrigin = new URL(url).origin
  log('info', `Loading local Web UI from ${allowedOrigin}`)
  await mainWindow.loadURL(url)
  if (quitting) return

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
    if (quitting) return
    log('error', error?.stack || String(error))
    if (!isSmokeTest) dialog.showErrorBox('Unable to start DeepSeek Harness', error?.message || String(error))
    await runtime?.stop()
    app.exit(1)
  })
}

app.on('activate', () => {
  if (!quitting && !mainWindow && runtime) {
    mainWindow = createWindow()
    const loadWindow = allowedOrigin ? mainWindow.loadURL(allowedOrigin) : showLoading()
    void loadWindow.catch(error => log('error', `Unable to restore application window: ${error.message}`))
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', (event) => {
  if (shutdownComplete) return
  event.preventDefault()
  if (quitting) return
  quitting = true
  Promise.resolve(runtime?.stop())
    .catch(() => log('error', 'Unable to stop the local runtime cleanly'))
    .finally(() => {
      shutdownComplete = true
      app.quit()
    })
})
