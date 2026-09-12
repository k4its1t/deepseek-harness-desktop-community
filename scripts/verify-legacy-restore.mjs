import assert from 'node:assert/strict'
import { Context } from '../test/fixtures/legacy-runtime/node_modules/@deepseek-ai/cordis/lib/index.js'
import SessionStore from '../test/fixtures/legacy-runtime/node_modules/@deepseek-ai/dsh-session/lib/index.js'
import Persistence from '../test/fixtures/legacy-runtime/node_modules/@deepseek-ai/dsh-session-persistence-jsonl/lib/index.js'

const ctx = new Context()
const fibers = []
try {
  fibers.push(await ctx.plugin(SessionStore))
  fibers.push(await ctx.plugin(Persistence, { root: process.argv[2] }))
  const history = await ctx.sessionPersistence.loadStored(process.argv[3])
  assert.ok(history)
  assert.match(JSON.stringify(history), /MIGRATION_SEED_REPLY/)
  assert.doesNotMatch(JSON.stringify(history), /DESKTOP_TOOL_DONE/)
  console.log('LEGACY_RESTORE_OK')
} finally { for (const fiber of fibers.reverse()) await fiber.dispose() }
