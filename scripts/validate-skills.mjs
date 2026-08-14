import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FileSystemSkillProvider } from '../runtime/node_modules/@deepseek-ai/dsh-skill-filesystem/lib/index.js'

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const runtimeRequire = createRequire(join(repositoryRoot, 'runtime', 'package.json'))
const { parse: parseYaml } = runtimeRequire('yaml')

const skillGroups = [
  {
    label: 'bundled companion',
    root: join(repositoryRoot, '.dsh', 'skills'),
    expected: new Map([
      ['diagnose-harness-desktop', ['references/diagnostic-map.md']],
      ['prepare-harness-bug-report', ['assets/bug-report-template.md']],
    ]),
  },
  {
    label: 'standalone',
    root: join(repositoryRoot, 'standalone-skills'),
    expected: new Map([
      ['analyze-images-locally', ['references/vision-prompts.md']],
    ]),
  },
]

async function validateGroup({ label, root, expected }) {
  const warnings = []
  const controller = new AbortController()
  const context = {
    get() {
      return undefined
    },
    logger: {
      debug() {},
      info() {},
      warn(message) {
        warnings.push(String(message))
      },
      error(message) {
        warnings.push(String(message))
      },
    },
  }

  const provider = new FileSystemSkillProvider(
    context,
    {
      invalidate() {},
      signal: controller.signal,
    },
    {
      providerName: `repository-${label.replaceAll(' ', '-')}-skill-validation`,
      includeDefaultRoots: false,
      customSkillDirs: [root],
      watch: false,
    },
  )

  try {
    const observation = await provider.list({ cwd: repositoryRoot, signal: controller.signal })
    const candidates = Array.isArray(observation) ? observation : observation.candidates

    assert.deepEqual(
      candidates.map(candidate => candidate.name).sort(),
      [...expected.keys()].sort(),
      `the Harness skill catalog must contain the documented ${label} skills`,
    )
    assert.deepEqual(warnings, [], `the Harness parser must not emit ${label} skill warnings`)

    for (const candidate of candidates) {
      const definition = await provider.get(candidate, {
        cwd: repositoryRoot,
        signal: controller.signal,
      })

      assert.ok(definition, `${candidate.name} must remain loadable`)
      assert.equal(
        definition.invocation.modelInvocable,
        true,
        `${candidate.name} must be model-invocable`,
      )
      assert.equal(
        definition.invocation.userInvocable,
        true,
        `${candidate.name} must be user-invocable`,
      )
      assert.ok(definition.content.trim().length > 0, `${candidate.name} must have instructions`)

      const skillDirectory = join(root, candidate.name)
      for (const resource of expected.get(candidate.name)) {
        await stat(join(skillDirectory, resource))
      }

      const openAiConfig = parseYaml(
        await readFile(join(skillDirectory, 'agents', 'openai.yaml'), 'utf8'),
      )
      assert.ok(openAiConfig?.interface?.display_name, `${candidate.name} must have a display name`)
      assert.ok(
        openAiConfig?.interface?.default_prompt?.includes(`$${candidate.name}`),
        `${candidate.name} must have an explicit default prompt`,
      )
    }

    return candidates.length
  } finally {
    controller.abort()
    await provider.dispose()
  }
}

let total = 0
for (const group of skillGroups) total += await validateGroup(group)

console.log(`Validated ${total} skills with the DeepSeek Harness parser.`)
