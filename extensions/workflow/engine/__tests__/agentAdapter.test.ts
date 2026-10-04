import { expect, test } from 'bun:test'
import {
  AgentAdapterRegistry,
  AdapterNotFoundError,
  type AgentAdapter,
} from '../agentAdapter.js'
import { createHostHandle } from '../ports.js'
import type { AgentRunParams, AgentRunResult } from '../types.js'
// PORT DEVIATION — the values are neutral, and that is a deliberate change from
// upstream's. Upstream imported `opus-4-5` / `opus-4` / `sonnet-4` from a
// monorepo-root `src/vendor-strings.ts` through a bare specifier, which a standalone
// copy cannot resolve: measured against upstream itself, `bun test` fails with
// `Cannot find module 'src/vendor-strings'` even when handed upstream's own root
// `tsconfig.json`, whose `paths` maps `src/*`. So the import had to change.
//
// Upstream's table justifies those names as identifiers "sent in an API request",
// unrenameable without breaking the product. That justification does not hold for
// this file: `matchRule` is a string prefix test and these strings reach no request,
// no registry, and no wire. Their only required property is the prefix relationship
// between them, so they are spelled `model-*` here — the routing contract under test
// is unchanged, and nothing third-party ships in a file where it means nothing.
const MODEL_STRONG_PATTERN = 'model-x'
const MODEL_STRONG = 'model-x-2'
const MODEL_OTHER = 'model-y'

function makeAdapter(
  id: string,
  result: AgentRunResult = {
    kind: 'ok',
    output: `out-${id}`,
    usage: { outputTokens: 1 },
  },
): AgentAdapter {
  return {
    id,
    capabilities: { structuredOutput: true },
    async run() {
      return result
    },
  }
}

const P = (over: Partial<AgentRunParams> = {}): AgentRunParams => ({
  prompt: 'p',
  ...over,
})

const CTX = {
  host: createHostHandle(null),
  signal: new AbortController().signal,
  runId: 'r',
  agentId: 1,
}

test('resolve goes to default adapter, run returns result', async () => {
  const reg = new AgentAdapterRegistry()
    .register(makeAdapter('a'))
    .register(makeAdapter('b'))
    .default('a')
  expect(reg.resolve(P()).id).toBe('a')
  const r = await reg.resolve(P()).run(P(), CTX)
  expect(r.kind).toBe('ok')
})

test('route agentType hit takes priority over default', () => {
  const reg = new AgentAdapterRegistry()
    .register(makeAdapter('default'))
    .register(makeAdapter('research'))
    .route({ kind: 'agentType', agentType: 'researcher', adapter: 'research' })
    .default('default')
  expect(reg.resolve(P({ agentType: 'researcher' })).id).toBe('research')
  expect(reg.resolve(P({ agentType: 'other' })).id).toBe('default')
})

test('route model prefix match', () => {
  const reg = new AgentAdapterRegistry()
    .register(makeAdapter('cheap'))
    .register(makeAdapter('strong'))
    .route({ kind: 'model', pattern: MODEL_STRONG_PATTERN, adapter: 'strong' })
    .default('cheap')
  expect(reg.resolve(P({ model: MODEL_STRONG })).id).toBe('strong')
  expect(reg.resolve(P({ model: MODEL_OTHER })).id).toBe('cheap')
  expect(reg.resolve(P()).id).toBe('cheap') // no model → default
})

// PORT DEVIATION: upstream paired this the other way round — the point-release string
// as the pattern against the family string as the model — and asserted a hit.
// `matchRule` is `params.model.startsWith(rule.pattern)`, and a shorter string cannot
// start with a longer one, so that assertion could not hold however the import
// resolved; the test was committed red alongside the constants it imports (both
// arrived in upstream 1fc59d9, so no earlier spelling restores it). The matcher is
// preserved verbatim — it is the shipped routing logic — and the pairing corrected to
// the direction the matcher implements: the pattern is the prefix, the model is the
// longer id.
//
// This pins that direction as a negative contract. Family-aware matching would be a
// reasonable thing to want from a router, but nothing in the engine asks for it and
// adopting it silently would re-route every model sharing a prefix.
test('model route is a literal prefix, not a family match', () => {
  const reg = new AgentAdapterRegistry()
    .register(makeAdapter('cheap'))
    .register(makeAdapter('strong'))
    .route({ kind: 'model', pattern: MODEL_STRONG, adapter: 'strong' })
    .default('cheap')
  expect(reg.resolve(P({ model: MODEL_STRONG_PATTERN })).id).toBe('cheap')
})

test('route custom predicate', () => {
  const reg = new AgentAdapterRegistry()
    .register(makeAdapter('main'))
    .register(makeAdapter('special'))
    .route({
      kind: 'custom',
      match: p => p.prompt.includes('VIP'),
      adapter: 'special',
    })
    .default('main')
  expect(reg.resolve(P({ prompt: 'handle VIP case' })).id).toBe('special')
  expect(reg.resolve(P({ prompt: 'normal' })).id).toBe('main')
})

test('rules match in order (first hit wins)', () => {
  const reg = new AgentAdapterRegistry()
    .register(makeAdapter('a'))
    .register(makeAdapter('b'))
    .route({ kind: 'agentType', agentType: 'x', adapter: 'a' })
    .route({ kind: 'agentType', agentType: 'x', adapter: 'b' })
  expect(reg.resolve(P({ agentType: 'x' })).id).toBe('a')
})

test('rule-matched adapter not registered → skip that rule and continue matching', () => {
  const reg = new AgentAdapterRegistry()
    .register(makeAdapter('real'))
    .route({ kind: 'agentType', agentType: 'x', adapter: 'ghost' })
    .route({ kind: 'agentType', agentType: 'x', adapter: 'real' })
  expect(reg.resolve(P({ agentType: 'x' })).id).toBe('real')
})

test('no match and no default → AdapterNotFoundError', () => {
  const reg = new AgentAdapterRegistry().register(makeAdapter('a'))
  expect(() => reg.resolve(P())).toThrow(AdapterNotFoundError)
})

test('default points to an unregistered adapter → still throws (no silent fallback)', () => {
  const reg = new AgentAdapterRegistry()
    .register(makeAdapter('a'))
    .default('missing')
  expect(() => reg.resolve(P())).toThrow(AdapterNotFoundError)
})

test('has / get', () => {
  const reg = new AgentAdapterRegistry().register(makeAdapter('a'))
  expect(reg.has('a')).toBe(true)
  expect(reg.has('b')).toBe(false)
  expect(reg.get('a')?.id).toBe('a')
  expect(reg.get('b')).toBeUndefined()
})

test('initializeAll / disposeAll triggers lifecycle (skips unimplemented)', async () => {
  const events: string[] = []
  const withLifecycle: AgentAdapter = {
    id: 'a',
    capabilities: { structuredOutput: false },
    async run() {
      return { kind: 'ok', output: 'x', usage: { outputTokens: 1 } }
    },
    async initialize() {
      events.push('init-a')
    },
    async dispose() {
      events.push('dispose-a')
    },
  }
  const noLifecycle = makeAdapter('b') // no initialize/dispose
  const reg = new AgentAdapterRegistry()
    .register(withLifecycle)
    .register(noLifecycle)
  await reg.initializeAll()
  await reg.disposeAll()
  expect(events).toEqual(['init-a', 'dispose-a'])
})

test('capabilities declaration is readable', () => {
  const adapter: AgentAdapter = {
    id: 'a',
    capabilities: { structuredOutput: true, tools: true, stream: false },
    async run() {
      return { kind: 'ok', output: 'x', usage: { outputTokens: 1 } }
    },
  }
  expect(adapter.capabilities.structuredOutput).toBe(true)
  expect(adapter.capabilities.tools).toBe(true)
  expect(adapter.capabilities.stream).toBe(false)
})
