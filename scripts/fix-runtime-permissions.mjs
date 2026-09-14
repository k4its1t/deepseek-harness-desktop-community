import { chmod, stat, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const target = process.argv[2] || `${process.platform}-${process.arch}`

// The pinned Windows runner needs a console when hosted by GUI-subsystem
// Electron. Keep the restricted child token and process flags unchanged.
// Upstream context: deepseek-ai/deepseek-harness discussion #5532.
if (target === 'win32-x64') {
  const runner = join(import.meta.dirname, '..', 'runtime', 'node_modules', '@deepseek-ai', 'dsh-sandbox-windows-acl', 'lib', 'runner.js')
  const marker = '// Desktop hidden console for restricted children.'
  const source = await readFile(runner, 'utf8')
  if (!source.includes(marker)) {
    const anchor = '\tif (api.setConsoleCtrlHandler(null, 1) === 0) fail(`SetConsoleCtrlHandler failed (Win32 ${api.getLastError()})`);'
    if (source.split(anchor).length !== 2) throw new Error('Windows runner changed; review the desktop console patch before packaging')
    const consoleSetup = `
\t${marker}
\tconst kernel32 = desktopKoffi.load('kernel32.dll');
\tconst getConsoleProcessList = kernel32.func('uint32 __stdcall GetConsoleProcessList(void *, uint32)');
\tconst getConsoleWindow = kernel32.func('void * __stdcall GetConsoleWindow()');
\tif (getConsoleProcessList(Buffer.alloc(4), 1) === 0) {
\t\tconst allocConsole = kernel32.func('int __stdcall AllocConsole()');
\t\tif (!allocConsole()) fail('Unable to create the desktop shell console');
\t\tconst showWindow = desktopKoffi.load('user32.dll').func('int __stdcall ShowWindow(void *, int)');
\t\tshowWindow(getConsoleWindow(), 0);
\t}
`
    await writeFile(runner, 'import desktopKoffi from "koffi";\n' + source.replace(anchor, consoleSetup + anchor))
  }
}

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
