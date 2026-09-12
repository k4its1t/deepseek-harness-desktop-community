import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme, screen, session, shell } from 'electron'
import { inspectUpgrade, backupUpgrade, recordFreshInstall } from './upgrade-backup.mjs'
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
let starting = false
let runtimeVersion

app.setName(APP_NAME)
// Test harnesses isolate Electron state as well as DSH_HOME.
if ((isSmokeTest || process.argv.includes('--desktop-e2e')) && process.env.DSH_DESKTOP_TEST_ROOT) {
  app.setPath('userData', join(process.env.DSH_DESKTOP_TEST_ROOT, 'electron'))
  app.setPath('logs', join(process.env.DSH_DESKTOP_TEST_ROOT, 'logs'))
}

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
      preload: join(import.meta.dirname, 'loading-preload.cjs'),
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
    { label: 'Help', submenu: [
      { label: 'About DeepSeek Harness Desktop', click: () => dialog.showMessageBox({
        type: 'info', message: `${APP_NAME} ${app.getVersion()}`,
        detail: `Harness ${runtimeVersion}\nUnofficial community project · Vibe Coding with Codex`,
      }) },
      { label: 'Upgrade backups', click: () => void shell.openPath(join(app.getPath('userData'), 'upgrade-backups')) },
    ] },
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
    workingDirectory: (isSmokeTest || process.argv.includes('--desktop-e2e')) && process.env.DSH_DESKTOP_TEST_ROOT
      ? process.env.DSH_DESKTOP_TEST_ROOT : app.getPath('home'),
    log,
    diagnosticLogging: isSmokeTest || process.argv.includes('--desktop-e2e') || settings.diagnosticLogging,
  })
  runtimeVersion = JSON.parse(readFileSync(join(runtime.dshBin, '..', '..', 'package.json'), 'utf8')).version
  app.setAboutPanelOptions({ applicationName: APP_NAME, applicationVersion: app.getVersion(), version: `Harness ${runtimeVersion}`, credits: 'Vibe Coding · Codex contributor · Unofficial community project' })
  runtime.on('unexpected-exit', (reason) => {
    if (quitting || starting) return
    allowedOrigin = undefined
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
  const requireRecoveryPage = (event) => {
    if (event.sender !== mainWindow?.webContents || event.senderFrame !== event.sender.mainFrame) throw new Error('Invalid recovery caller')
    const url = new URL(event.senderFrame.url)
    if (url.protocol !== 'file:' || url.pathname !== loadingPageUrl.pathname) throw new Error('Recovery is only available on the local loading page')
  }
  ipcMain.handle('desktop:retry', async (event) => { requireRecoveryPage(event); await startRuntime() })
  ipcMain.handle('desktop:open-logs', async (event) => { requireRecoveryPage(event); await shell.openPath(app.getPath('logs')) })
  installMenu()
  await startRuntime()
}

async function startRuntime() {
  if (starting || quitting) return
  starting = true
  allowedOrigin = undefined
  try {
    await runtime.stop()
    await showLoading()
    const plan = await inspectUpgrade({ dshHome: runtime.dshHome, stateDirectory: app.getPath('userData'), runtimeVersion })
    if (plan.required) {
      if (isSmokeTest) throw new Error('Smoke tests require a fresh isolated DSH_HOME; existing data will not be migrated automatically')
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'info', message: 'Back up Harness data before upgrading / 升级前备份',
        detail: `Close CLI and other Harness instances using this data first.\n请先关闭使用此数据目录的 CLI 和其他 Harness 实例。\n\n${runtime.dshHome}\n\nA private backup will be created before Harness ${runtimeVersion} starts. Do not restart older clients against upgraded data.`,
        buttons: ['Cancel / 取消', 'Closed other instances — Back up / 已关闭其他实例，开始备份'], defaultId: 0, cancelId: 0,
      })
      if (result.response !== 1) throw new Error('Upgrade paused. Close other Harness instances, then click Retry to back up and continue. / 升级已暂停，请关闭其他实例后重试。')
      await showLoading('starting', 'Backing up existing Harness data…')
      await backupUpgrade(plan, { backupRoot: join(app.getPath('userData'), 'upgrade-backups') })
    }
    if (quitting) return
    const url = await runtime.start()
    if (quitting) return
    allowedOrigin = new URL(url).origin
    log('info', `Loading local Web UI from ${allowedOrigin}`)
    await mainWindow.loadURL(url)
    if (plan.fresh) await recordFreshInstall({ dshHome: runtime.dshHome, stateDirectory: app.getPath('userData'), runtimeVersion })
    if (quitting) return

    if (openDevTools) mainWindow.webContents.openDevTools({ mode: 'detach' })
    if (isSmokeTest) {
      await waitForUiReady(mainWindow)
      console.log('DESKTOP_SMOKE_OK')
      await runtime.stop()
      app.quit()
    }
  } catch (error) {
    allowedOrigin = undefined
    await runtime.stop()
    log('error', 'Runtime startup failed; see the recovery page for details')
    if (isSmokeTest) { console.error(error.message); app.exit(1); return }
    await showLoading('error', error.message)
  } finally { starting = false }
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
