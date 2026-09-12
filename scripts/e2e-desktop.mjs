import { _electron as automation } from 'playwright'
import electron from 'electron'
import { createServer } from 'node:http'
import { mkdtemp, mkdir, rm, cp, readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { inspectUpgrade, backupUpgrade } from '../src/upgrade-backup.mjs'

const execute = promisify(execFile)
const migration = process.argv.includes('--migration')
const executableArg = process.argv.slice(2).find(arg => !arg.startsWith('--'))

const root = await mkdtemp(join(tmpdir(), 'desktop-e2e-'))
const workspace = join(root, '中文 project space')
await mkdir(workspace)
let toolResultSeen = false
let cancelledConnection = false
const server = createServer(async (req, res) => {
  let raw = ''
  for await (const chunk of req) raw += chunk
  if (!req.url.endsWith('/chat/completions')) { res.writeHead(404); res.end(); return }
  const body = JSON.parse(raw)
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' })
  const send = (delta, finish_reason = null) => res.write(`data: ${JSON.stringify({ id: 'test-completion', object: 'chat.completion.chunk', created: 1, model: body.model, choices: [{ index: 0, delta, finish_reason }] })}\n\n`)
  const prompt = [...body.messages].reverse().find(message => message.role === 'user' && /DESKTOP_|MIGRATION_SEED/.test(JSON.stringify(message.content)))?.content
  const text = typeof prompt === 'string' ? prompt : JSON.stringify(prompt) || ''
  const isAgent = body.tools?.length > 0
  if (isAgent && text.includes('DESKTOP_CANCEL_PROMPT')) {
    send({ role: 'assistant', content: 'DESKTOP_CANCEL_STREAM' })
    const heartbeat = setInterval(() => res.write(': waiting\n\n'), 200)
    res.once('close', () => { clearInterval(heartbeat); cancelledConnection = true })
    return
  }
  if (isAgent && text.includes('DESKTOP_TOOL_PROMPT')) {
    const last = body.messages.at(-1)
    if (last.role !== 'tool') {
      const toolName = process.platform === 'win32' ? 'pwsh' : 'bash'
      assert.ok(body.tools.some(tool => tool.function.name === toolName), `${toolName} must be available`)
      send({ role: 'assistant', tool_calls: [{ index: 0, id: 'desktop-test-tool', type: 'function', function: {
        name: toolName, arguments: JSON.stringify({ command: 'echo DESKTOP_TOOL_OK', description: 'Desktop integration test' }),
      } }] })
      send({}, 'tool_calls')
      res.end('data: [DONE]\n\n')
      return
    }
    toolResultSeen = JSON.stringify(last).includes('DESKTOP_TOOL_OK')
    send({ role: 'assistant', content: 'DESKTOP_TOOL_DONE' })
  } else send({ role: 'assistant', content: text.includes('MIGRATION_SEED') ? 'MIGRATION_SEED_REPLY' : 'DESKTOP_TEST_REPLY' })
  send({}, 'stop')
  res.end('data: [DONE]\n\n')
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const env = { ...process.env, DSH_HOME: join(root, 'dsh'), DSH_AGENTS_HOME: join(root, 'agents'), DSH_DESKTOP_TEST_ROOT: root,
  DSH_TELEMETRY_MODE: 'DISABLED', DEEPSEEK_API_KEY: 'desktop-test-only', DEEPSEEK_BASE_URL: `http://127.0.0.1:${server.address().port}` }
delete env.ELECTRON_RUN_AS_NODE
for (const key of Object.keys(env)) {
  if (/API_KEY|BASE_URL/.test(key) && !['DEEPSEEK_API_KEY', 'DEEPSEEK_BASE_URL'].includes(key)) delete env[key]
}
let app
let page
let backup
let legacyId
let runtimeOutput = ''
const launchOptions = { executablePath: executableArg ? resolve(executableArg) : electron,
  args: [...(executableArg ? [] : ['.']), '--desktop-e2e', '--lang=zh-CN'], env, timeout: 60_000 }
try {
  if (migration) {
    app = await automation.launch({ executablePath: electron, args: ['scripts/legacy-test-host.mjs', '--lang=zh-CN'], env, timeout: 60_000 })
    page = await app.firstWindow()
    await page.waitForURL('http://127.0.0.1:*/**', { timeout: 60_000 })
    await page.getByRole('button', { name: '继续', exact: true }).click()
    await page.getByRole('textbox', { name: '选择工作区' }).click()
    const picker = page.getByRole('dialog', { name: '选择工作区目录' })
    await picker.getByRole('button', { name: '编辑路径' }).click()
    await picker.getByRole('textbox', { name: '编辑路径' }).fill(workspace)
    await picker.getByRole('textbox', { name: '编辑路径' }).press('Enter')
    await picker.getByRole('button', { name: '打开', exact: true }).click()
    const composer = page.locator('textarea:enabled').first()
    await composer.fill('MIGRATION_SEED')
    await composer.press('Enter')
    await page.getByText('MIGRATION_SEED_REPLY', { exact: true }).first().waitFor({ timeout: 30_000 })
    await app.close()
    app = undefined
    page = undefined
    const files = await readdir(join(env.DSH_HOME, 'sessions'), { recursive: true })
    legacyId = files.map(file => file.split(/[\\/]/).find(part => part.startsWith('session-'))).find(Boolean)
    assert.ok(legacyId, 'legacy CLI must persist its session')
    const options = { dshHome: env.DSH_HOME, stateDirectory: join(root, 'electron'), runtimeVersion: '0.1.5-rc.1' }
    backup = await backupUpgrade(await inspectUpgrade(options), { backupRoot: join(root, 'backups') })
    console.log('LEGACY_SEED_AND_BACKUP_OK', legacyId)
  }
  app = await automation.launch(launchOptions)
  app.process().stderr.on('data', chunk => { runtimeOutput += chunk })
  page = await app.firstWindow()
  await page.waitForURL('http://127.0.0.1:*/**', { timeout: 60_000 })
  await page.waitForFunction(() => Boolean(window.__DSH_BOOT__) && document.body.innerText.length > 100)
  if (!migration) await page.getByRole('button', { name: '继续', exact: true }).click()
  if (!migration) {
  await page.getByRole('textbox', { name: '选择工作区' }).click()
  const picker = page.getByRole('dialog', { name: '选择工作区目录' })
  await picker.getByRole('button', { name: '编辑路径' }).click()
  await picker.getByRole('textbox', { name: '编辑路径' }).fill(workspace)
  await picker.getByRole('textbox', { name: '编辑路径' }).press('Enter')
  await picker.getByRole('button', { name: '打开', exact: true }).click()
  await picker.waitFor({ state: 'hidden' })
  }
  if (migration) {
    await page.getByRole('treeitem').filter({ hasText: /MIGRATION_SEED/ }).first().click()
    await page.getByText('MIGRATION_SEED_REPLY', { exact: true }).last().waitFor({ timeout: 30_000 })
  }
  const composer = page.locator('[contenteditable="true"],textarea:enabled').first()
  await composer.waitFor({ timeout: 20_000 })
  await composer.fill('DESKTOP_TEST_PROMPT')
  await composer.press('Enter')
  await page.getByText('DESKTOP_TEST_REPLY', { exact: true }).first().waitFor({ timeout: 30_000 })
  await composer.fill('DESKTOP_TOOL_PROMPT')
  await composer.press('Enter')
  await page.getByText('DESKTOP_TOOL_DONE', { exact: true }).waitFor({ timeout: 30_000 })
  assert.equal(toolResultSeen, true, 'the real shell tool must return its output to the model')
  await composer.fill('DESKTOP_CANCEL_PROMPT')
  await composer.press('Enter')
  await page.getByText('DESKTOP_CANCEL_STREAM', { exact: true }).waitFor({ timeout: 30_000 })
  await page.getByRole('button', { name: '停止生成', exact: true }).click()
  await page.getByRole('button', { name: '停止生成', exact: true }).waitFor({ state: 'hidden' })
  assert.equal(cancelledConnection, true, 'cancel must abort the model connection')
  const sessionUrl = page.url()
  await page.reload()
  await page.getByText('DESKTOP_TOOL_DONE', { exact: true }).waitFor({ timeout: 30_000 })
  assert.equal(page.url(), sessionUrl)
  await app.close()
  app = await automation.launch(launchOptions)
  page = await app.firstWindow()
  await page.waitForURL('http://127.0.0.1:*/**', { timeout: 60_000 })
  await page.getByRole('treeitem').filter({ hasText: migration ? /MIGRATION_SEED/ : /DESKTOP_TEST/ }).first().click({ timeout: 30_000 })
  await page.getByText('DESKTOP_TOOL_DONE', { exact: true }).waitFor({ timeout: 30_000 })
  assert.equal(await page.evaluate(() => typeof window.desktopRecovery), 'undefined', 'remote UI must not receive recovery APIs')
  await app.evaluate(async ({ app, BrowserWindow }) => {
    await BrowserWindow.getAllWindows()[0].loadFile(app.getAppPath() + '/src/loading.html', { query: { status: 'error', message: 'Test recovery / 测试恢复' } })
  })
  await page.getByRole('button', { name: 'Retry / 重试', exact: true }).click()
  await page.waitForURL('http://127.0.0.1:*/**', { timeout: 60_000 })
  await page.getByRole('treeitem').filter({ hasText: migration ? /MIGRATION_SEED/ : /DESKTOP_TEST/ }).first().click({ timeout: 30_000 })
  await page.getByText('DESKTOP_TOOL_DONE', { exact: true }).waitFor({ timeout: 30_000 })
  console.log('RECOVERY_E2E_OK — local retry restarts the runtime and restores authenticated history')
  console.log('DESKTOP_E2E_OK — workspace, mock chat, real shell, cancel, history reload and full restart')
  if (migration) {
    await app.close()
    app = undefined
    const restored = join(root, 'restored')
    await cp(join(backup, 'data'), restored, { recursive: true, dereference: false, verbatimSymlinks: true })
    const result = await execute(process.execPath, [resolve('scripts/verify-legacy-restore.mjs'), join(restored, 'sessions'), legacyId], { env, timeout: 30_000 })
    assert.match(result.stdout, /LEGACY_RESTORE_OK/)
    console.log('MIGRATION_AND_LEGACY_RESTORE_OK')
  }
} catch (error) {
  console.error(runtimeOutput.slice(-7000))
  if (page && !page.isClosed()) console.error((await page.locator('body').innerText()).slice(0, 7000))
  throw error
} finally {
  await app?.close()
  server.closeAllConnections()
  await new Promise(resolve => server.close(resolve))
  await rm(root, { recursive: true, force: true })
}
