import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { AgentInfo, On, SessionUsage } from 'claude-code'

const PANE = {
  plugin: 'cruscotto',
  component: 'Pane',
  requestId: 'cruscotto',
  props: {
    title: 'Cruscotto',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

const SURFACES = ['terminal', 'desktop'] as const
const NOW = Date.UTC(2026, 0, 1, 12, 0)
/** At 60 columns: the context and cache bars, and the limit bars. */
const CELLS = 30
const LIMIT_CELLS = 16
const ORBIT = '[◐◓◑◒]'
const GREEN = '#81C784'

function usage(partial: Partial<SessionUsage> = {}): SessionUsage {
  return {
    startedAt: 0,
    context: { tokens: 40_000, window: 200_000, percent: 20 },
    rateLimits: [],
    cost: { usd: 0.5 },
    ...partial,
  }
}

/** The folder and git the pane reads; a branch of null is a folder git refuses. */
function host(on: On, branch: string | null = 'main', cwd = 'C:\\Repos\\Demo') {
  on('session.cwd', () => ({ value: cwd }))
  on('process.run', () => ({
    value: {
      exitCode: branch === null ? 128 : 0,
      stdout: branch === null ? '' : `${branch}\n`,
      stderr: '',
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }))
}

/** One session.measure: the moment the mod reads git and the context's composition. */
function measure($: Engine, on: On) {
  on('session.measure', () => ({ changed: [] }))
  return $.session.measure({ context: { window: 200_000 }, rateLimits: [], changed: [] })
}

/** Answers the bottom of turn.step; the result calls it with the step's loop and effort. */
function stepper($: Engine, on: On) {
  on('turn.step', async function* () {
    return { turnId: 't', index: 0, answer: '', toolUses: [], stopReason: null, usage: null }
  })
  return async (agentId: string | undefined, effort: 'high' | 'low') => {
    for await (const _ of $.turn.step({ turnId: 't', index: 0, model: 'claude-opus-4-1', effort, messageCount: 1, agentId })) void _
  }
}

function running(id: string): AgentInfo {
  return { id, description: `task ${id}`, type: 'general-purpose', status: 'running' }
}

const spent = (input: number, output: number, read: number, write: number, model = 'claude-opus-5-5') => ({
  input_tokens: input, output_tokens: output, cache_read_input_tokens: read, cache_creation_input_tokens: write, model,
})

const closed = (text: string, agentId?: string, use = spent(1, 1, 0, 0)): Parameters<Engine['turn']['complete']>[0] => ({
  answer: text, durationMs: 1, isAborted: false, turnId: 't', reason: 'answer', agentId, usage: use,
})

test('contesto: barra e token', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', () => ({ value: usage({ context: { tokens: 160_000, window: 200_000, percent: 80 } }) }))
  on('agent.list', () => ({ value: [] }))

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /^ctx/ }))?.text).toBe(`ctx   ${'━'.repeat(24)}${'─'.repeat(6)} 80% 160k/200k`)
    expect((await ui.find({ type: 'Text', text: /\$$/ }))?.text).toBe('0.50 $')
    await ui.unmount()
  }
})

test('contesto: barra divisa per categoria con legenda e MCP', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', (_, e) => ({
    value: usage({
      context: {
        tokens: 100_000, window: 200_000, percent: 50,
        breakdown: e?.breakdown === undefined ? undefined : {
          categories: [
            { name: 'Messages', tokens: 60_000, color: 'x', isDeferred: false, kind: 'used' },
            { name: 'System tools', tokens: 30_000, color: 'x', isDeferred: false, kind: 'used' },
            { name: 'MCP tools', tokens: 10_000, color: 'x', isDeferred: false, kind: 'used' },
            { name: 'Free space', tokens: 100_000, color: 'x', isDeferred: false, kind: 'free' },
          ],
          mcpTools: [
            { name: 'mcp__gmail__a', serverName: 'Gmail', tokens: 6_000, isLoaded: true },
            { name: 'mcp__drive__a', serverName: 'Drive', tokens: 4_000, isLoaded: true },
            { name: 'mcp__gamma__a', serverName: 'Gamma', tokens: 9_000, isLoaded: false },
          ],
        } as never,
      },
    }),
  }))
  on('agent.list', () => ({ value: [] }))
  await measure($, on)

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /^ctx/ }))?.text).toBe(`ctx   ${'━'.repeat(15)}${'─'.repeat(15)} 50% 100k/200k`)
    expect((await ui.find({ type: 'Text', text: /■/ }))?.text).toBe('      ■ messaggi 60k ■ tool 30k ■ MCP 10k ')
    // Only schemas inside the window count.
    expect((await ui.find({ type: 'Text', text: /^MCP/ }))?.text).toBe('MCP    Gmail 6k · Drive 4k')
    await ui.unmount()
  }
})

test('limiti: 5 ore e settimana con il reset nella stessa colonna', async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.store(on)
  host(on)
  const at = (hours: number) => new Date(NOW + hours * 3_600_000).toISOString()
  on('session.usage', () => ({
    value: usage({
      rateLimits: [
        { kind: 'spend_limit', percentUsed: 65 },
        { kind: 'seven_day', percentUsed: 30, resetsAt: at(3 * 24 + 4) },
        { kind: 'five_hour', percentUsed: 90, resetsAt: at(2.25) },
      ],
    }),
  }))
  on('agent.list', () => ({ value: [] }))
  const DAY = '(lun|mar|mer|gio|ven|sab|dom) \\d\\d:\\d\\d'

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })
    const five = (await ui.find({ type: 'Text', text: /^5 ore/ }))?.text ?? ''
    const week = (await ui.find({ type: 'Text', text: /^7 giorni/ }))?.text ?? ''
    expect(five).toMatch(new RegExp(`^5 ore {4}━{14}─{2}  90%  ◷ {4}2h15  ${DAY}$`))
    expect(week).toMatch(new RegExp(`^7 giorni ━{5}─{11}  30%  ◷ {3}3g 4h  ${DAY}$`))
    expect((await ui.find({ type: 'Text', text: /^Spesa/ }))?.text).toBe(`Spesa    ${'━'.repeat(10)}${'─'.repeat(6)}  65%  ◷ n/d`)
    // The two resets start, count and end in the same columns.
    expect(week.indexOf('◷')).toBe(five.indexOf('◷'))
    expect(week.length).toBe(five.length)
    await ui.unmount()
  }
})

test('limiti: il reset settimanale ricordato quando la lettura non lo porta', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  mock.store(on, { resets: { seven_day: new Date(NOW + 26 * 3_600_000).toISOString() } })
  host(on)
  let limits: SessionUsage['rateLimits'] = [{ kind: 'five_hour', percentUsed: 12, resetsAt: new Date(NOW + 3_600_000).toISOString() }]
  on('session.usage', () => ({ value: usage({ rateLimits: limits }) }))
  on('agent.list', () => ({ value: [] }))
  on('session.start', () => ({ cwd: '/r' }))
  on('command.register', () => ({ value: { command: 'cruscotto' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.close', () => ({ value: undefined }))
  await $.session.start({ cwd: '/r', surface: 'terminal', isInteractive: true })

  // Not reported at all: the row stays, with the reset it last had.
  let ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^7 giorni/ }))?.text).toMatch(/^7 giorni ─{16} {4}– {2}◷ {2}≈1g 2h {2}\S+ \d\d:\d\d$/)
  await ui.unmount()

  // Reported without a reset: the percentage is the reading's, the reset the remembered one.
  limits = [...limits, { kind: 'seven_day', percentUsed: 40 }]
  ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^7 giorni/ }))?.text).toMatch(/  40%  ◷ {2}≈1g 2h  /)
  await ui.unmount()

  // Past it, the week rolls on by seven days.
  await clock.advance(27 * 3_600_000)
  ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^7 giorni/ }))?.text).toMatch(/◷ ≈6g 23h  /)
  await ui.unmount()
})

test('limiti: un reset letto resta per la sessione dopo', async ($, on) => {
  mock.clock(on, { now: NOW })
  const reset = new Date(NOW + 50 * 3_600_000).toISOString()
  const saved: unknown[] = []
  on('store.set', (_, e) => {
    saved.push(e.value)
    return { value: undefined }
  })
  host(on)
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: [] }))
  on('session.measure', () => ({ changed: [] }))

  await $.session.measure({ context: { window: 200_000 }, rateLimits: [{ kind: 'seven_day', percentUsed: 5, resetsAt: reset }], changed: [] })
  await $.session.measure({ context: { window: 200_000 }, rateLimits: [{ kind: 'seven_day', percentUsed: 6, resetsAt: reset }], changed: [] })
  expect(saved).toEqual([{ seven_day: reset }])
})

test('nessuna lettura: limiti, modello e token non disponibili', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200_000 }, rateLimits: [] } }))
  on('agent.list', () => ({ value: [] }))

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: /^non disponibile \(nessuna lettura ancora\)$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^non disponibile · effort non disponibile$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Token: non disponibile \(finestra 200k\)$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^cache/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /Dove vanno/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('cache: hit rate, ultimo turno e countdown fino alla scadenza', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  host(on)
  let cost = 0.5
  on('session.usage', () => ({ value: usage({ context: { tokens: 92_000, window: 200_000, percent: 46 }, cost: { usd: cost } }) }))
  on('agent.list', () => ({ value: [] }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))

  await $.turn.start({ text: 'ciao', turnId: 't' })
  cost = 0.62
  // 90k served by the cache, 8k written, 2k fresh: 90% hit.
  await $.turn.complete(closed('ok', undefined, spent(2_000, 1_200, 90_000, 8_000)))

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /^cache/ }))?.text).toBe(`cache ${'━'.repeat(27)}${'─'.repeat(3)} 90% hit · 90k letti`)
    expect((await ui.find({ type: 'Text', text: /^turno/ }))?.text).toBe('turno ↓100k ↑1k · cache 90% · +0.12 $')
    expect((await ui.find({ type: 'Text', text: /cache calda/ }))?.text).toBe('      ◷ cache calda ancora 5:00')
    await ui.unmount()
  }

  await clock.advance(4 * 60_000 + 30_000)
  let ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /cache calda/ }))?.text).toBe('      ◷ cache calda ancora 0:30')
  await ui.unmount()

  await clock.advance(60_000)
  ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /scaduta/ }))?.text).toBe('      ⚠ cache scaduta: il prossimo turno riscrive ~92k')
  await ui.unmount()
})

test('cache: durata di un\'ora dalle opzioni', { options: { cacheTtl: '1h' } }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: [] }))
  on('turn.complete', () => ({ text: '' }))

  await $.turn.complete(closed('ok', undefined, spent(10, 10, 1_000, 0)))
  await clock.advance(30 * 60_000)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /cache calda/ }))?.text).toBe('      ◷ cache calda ancora 30:00')
  await ui.unmount()
})

test('dove vanno i token: output dei tool, il più grosso e i file riletti', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: [] }))
  const outputs: Record<string, string> = { Bash: 'x'.repeat(48_000), Read: 'y'.repeat(4_000), Grep: 'z'.repeat(400) }
  on('tool.call', (_, e) => ({ result: {}, text: outputs[e.tool] ?? '' }))

  await $.tool.call({ tool: 'Bash', command: 'npm test -- --reporter verbose' })
  for (let i = 0; i < 4; i++) await $.tool.call({ tool: 'Read', file_path: '/r/src/register.tsx' })
  await $.tool.call({ tool: 'Read', file_path: '/r/a.ts' })
  await $.tool.call({ tool: 'Grep', pattern: 'atom' })

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: /Dove vanno i token/ })).toBeDefined()
    expect((await ui.find({ type: 'Text', text: /^output/ }))?.text).toBe('output Bash 12k×1 · Read 5k×5 · Grep 100×1')
    expect((await ui.find({ type: 'Text', text: /^↯/ }))?.text).toBe('↯ max   Bash npm test -- --reporter verb… 12k')
    expect((await ui.find({ type: 'Text', text: /^⟳/ }))?.text).toBe('⟳ riletti register.tsx ×4')
    await ui.unmount()
  }
})

test('subagent: tempi, token e stato', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  host(on)
  let list: AgentInfo[] = [running('a1'), running('a2')]
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: list }))
  on('agent.spawn', (_, e) => ({ model: e.model ?? 'claude-opus-4-1', agentId: e.description }))
  on('turn.complete', () => ({ text: '' }))
  const step = stepper($, on)

  const spawn = (description: string, model?: string) =>
    $.agent.spawn({
      tool_use_id: `t-${description}`,
      prompt: 'x',
      description,
      subagentType: 'general-purpose',
      provider: { plugin: 'engine', tier: 'core' },
      model,
      parentModel: 'claude-opus-4-1',
      background: true,
      fork: false,
    })
  await spawn('a1')
  await clock.advance(5 * 60_000)
  await spawn('a2')
  await clock.advance(60_000)
  await step('a1', 'low')

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /^Subagent/ }))?.text).toMatch(/^Subagent 2 attivi · 2 totali ─+$/)
    expect((await ui.find({ type: 'Text', text: /task a1/ }))?.text).toMatch(new RegExp(`^${ORBIT} opus low     6m    –  task a1$`))
    expect((await ui.find({ type: 'Text', text: /task a2/ }))?.text).toMatch(new RegExp(`^${ORBIT} opus –       1m    –  task a2$`))
    await ui.unmount()
  }

  // Once one finishes its elapsed time stops and its tokens are counted.
  list = [running('a1'), { ...running('a2'), status: 'completed' }]
  await $.turn.complete(closed('', 'a2', spent(1_000, 2_000, 10_000, 1_000)))
  await clock.advance(10 * 60_000)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /task a2/ }))?.text).toBe('✓ opus –       1m  14k  task a2')
  expect((await ui.find({ type: 'Text', text: /^Subagent/ }))?.text).toMatch(/^Subagent 1 attivi · 2 totali · 14k ─+$/)
  await ui.unmount()
})

test('il modello principale arriva dal turno completato', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: [] }))
  on('turn.complete', () => ({ text: '' }))

  await $.turn.complete(closed('ok', undefined, spent(1, 1, 0, 0, 'claude-sonnet-4-5')))

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /· effort/ }))?.text).toBe('sonnet · effort non disponibile')
  await ui.unmount()
})

test('intestazione: branch, costo e simbolo di riposo', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on, 'feature/x', 'C:\\Repos\\Demo')
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: [] }))

  await measure($, on)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /feature\/x/ }))?.text).toBe('◆ ⎇ feature/x')
    expect(await ui.find({ type: 'Text', text: /Demo/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('intestazione: senza git, cartella con slash', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on, null, '/home/me/demo/')
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: [] }))

  await measure($, on)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /demo$/ }))?.text).toBe('◆ demo')
  await ui.unmount()
})

test('intestazione: lo spinner gira mentre il turno principale lavora', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  host(on, 'main')
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: [] }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))

  await measure($, on)
  await $.turn.start({ text: 'vai', turnId: 't' })
  const frames = new Set<string>()
  for (let i = 0; i < 4; i++) {
    const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
    const text = (await ui.find({ type: 'Text', text: /⎇ main/ }))?.text ?? ''
    expect(text).toMatch(/^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏] ⎇ main$/)
    frames.add(text)
    expect((await ui.find({ type: 'Text', text: /cache in uso/ }))?.text).toMatch(new RegExp(`^ {6}${ORBIT} cache in uso$`))
    await ui.unmount()
    await clock.advance(120)
  }
  expect(frames.size).toBeGreaterThan(1)

  await $.turn.complete(closed('ok'))
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /⎇ main/ }))?.text).toBe('◆ ⎇ main')
  await ui.unmount()
})

test('le barre scorrono verso il nuovo valore', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  host(on)
  let percent = 20
  on('session.usage', () => ({ value: usage({ context: { tokens: percent * 2_000, window: 200_000, percent } }) }))
  on('agent.list', () => ({ value: [] }))

  const filled = async () => {
    const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
    const text = (await ui.find({ type: 'Text', text: /^ctx/ }))?.text ?? ''
    await ui.unmount()
    return (text.match(/━/g) ?? []).length
  }
  expect(await filled()).toBe(6)
  percent = 80
  const first = await filled()
  expect(first).toBeGreaterThan(6)
  expect(first).toBeLessThan(24)
  for (let i = 0; i < 12; i++) {
    await clock.advance(120)
    await filled()
  }
  expect(await filled()).toBe(24)
})

test('effort principale dal turn.step, non da quello dei subagent', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: [] }))
  const step = stepper($, on)

  const before = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await before.find({ type: 'Text', text: /· effort/ }))?.text).toBe('non disponibile · effort non disponibile')
  await before.unmount()

  await step('a1', 'low')
  await step(undefined, 'high')
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /· effort/ }))?.text).toBe('non disponibile · effort high')
  await ui.unmount()
})

test('nomi dei modelli senza versione; alias e formati ignoti restano', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: [] }))
  on('turn.complete', () => ({ text: '' }))

  const cases = [
    ['claude-sonnet-4-5-20250929', 'sonnet'],
    ['claude-opus-5-5', 'opus'],
    ['claude-opus-4-1[1m]', 'opus'],
    ['claude-fable-5-1', 'fable'],
    ['sonnet', 'sonnet'],
    ['claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-20241022'],
  ] as const
  for (const [id, shown] of cases) {
    await $.turn.complete(closed('ok', undefined, spent(1, 1, 0, 0, id)))
    const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
    expect((await ui.find({ type: 'Text', text: /· effort/ }))?.text).toBe(`${shown} · effort non disponibile`)
    await ui.unmount()
  }
})

test('subagent: attivi prima, terminati quanti ne entrano', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', () => ({ value: usage() }))
  const done = (n: number): AgentInfo => ({ ...running(`d${n}`), status: n % 2 ? 'failed' : 'completed' })
  on('agent.list', () => ({ value: [done(1), done(2), done(3), done(4), done(5), done(6), done(7), running('w')] }))

  let ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^Subagent/ }))?.text).toMatch(/^Subagent 1 attivi · 8 totali ─+$/)
  expect((await ui.find({ type: 'Text', text: /task w$/ }))?.text).toMatch(new RegExp(`^${ORBIT} – –${' '.repeat(8)}–    –  task w$`))
  expect((await ui.find({ type: 'Text', text: /task d7$/ }))?.text).toBe(`✗ – –${' '.repeat(8)}–    –  task d7`)
  expect(await ui.find({ type: 'Text', text: /task d3$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /task d2$/ })).toBeUndefined()
  expect((await ui.find({ type: 'Text', text: /terminati/ }))?.text).toBe('+2 terminati')
  await ui.unmount()

  // A short pane keeps everything in view: fewer finished ones.
  ui = await $.ui.mount({ ...PANE, surface: 'terminal', props: { ...PANE.props, scroll: { offset: 0, bodyRows: 14 } } })
  expect(await ui.find({ type: 'Text', text: /task w$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /task d7$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /task d6$/ })).toBeUndefined()
  expect((await ui.find({ type: 'Text', text: /terminati/ }))?.text).toBe('+6 terminati')
  await ui.unmount()
})

/** Records each text `$.ui.status` is given; the last one is what the line shows. */
function statusLine(on: On) {
  const texts: (string | undefined)[] = []
  on('ui.status', (_, e) => {
    texts.push(e.text)
    return { value: undefined }
  })
  return texts
}

/** The tool itself: runs, or is refused with `deny`. */
function tools(on: On, deny?: string) {
  on('tool.call', () => (deny === undefined ? { result: {}, text: '' } : { deny }))
}

test('barra di stato: modello, contesto, cache, subagent, file e comandi', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  host(on)
  const status = statusLine(on)
  on('session.usage', () => ({ value: usage({ context: { tokens: 82_000, window: 200_000, percent: 41 } }) }))
  on('agent.list', () => ({
    value: [running('a1'), running('a2'), running('a3'), { ...running('a4'), status: 'completed' }],
  }))
  on('agent.spawn', (_, e) => ({ model: e.model ?? 'claude-opus-5-5', agentId: e.description }))
  on('turn.complete', () => ({ text: '' }))
  tools(on)

  for (const [description, model] of [['a1', 'claude-sonnet-4-5-20250929'], ['a2', 'claude-haiku-4-5'], ['a3', 'claude-sonnet-4-5'], ['a4', 'claude-opus-5-5']] as const) {
    await $.agent.spawn({
      tool_use_id: `t-${description}`, prompt: 'x', description, subagentType: 'general-purpose',
      provider: { plugin: 'engine', tier: 'core' }, model, parentModel: 'claude-opus-5-5', background: true, fork: false,
    })
  }
  await $.turn.complete(closed('ok', undefined, spent(500, 100, 9_000, 500)))
  // Two files, one of them edited twice and once by a subagent; two commands.
  await $.tool.call({ tool: 'Edit', file_path: '/r/a.ts', old_string: 'x', new_string: 'y' })
  await $.tool.call({ tool: 'Edit', file_path: '/r/a.ts', old_string: 'y', new_string: 'z', agentId: 'a1' })
  await $.tool.call({ tool: 'Write', file_path: '/r/b.ts', content: '' })
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  await $.tool.call({ tool: 'Bash', command: 'pwd', agentId: 'a2' })
  await clock.advance(250)

  expect(status.at(-1)).toMatch(/^✓ \d\d:\d\d · opus · ctx 41% · cache 90% · agenti 3 sonnet, haiku · ✎2 ⚡2$/)
})

test('barra di stato: una raffica di chiamate, un solo aggiornamento', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  host(on)
  const status = statusLine(on)
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: [] }))
  tools(on)

  for (let i = 0; i < 10; i++) await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect(status.length).toBe(0)
  await clock.advance(250)
  expect(status).toEqual(['ctx 20% · ⚡10'])
})

test('barra di stato: segmenti vuoti omessi', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  host(on)
  const status = statusLine(on)
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200_000 }, rateLimits: [] } }))
  on('agent.list', () => ({ value: [] }))
  tools(on)

  await measure($, on)
  await clock.advance(250)
  expect(status.at(-1)).toBeUndefined()

  await $.tool.call({ tool: 'Bash', command: 'ls' })
  await clock.advance(250)
  expect(status.at(-1)).toBe('⚡1')

  await $.tool.call({ tool: 'Write', file_path: '/r/a.ts', content: '' })
  await clock.advance(250)
  expect(status.at(-1)).toBe('✎1 ⚡1')
})

test('barra di stato: una chiamata rifiutata non conta', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  host(on)
  const status = statusLine(on)
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: [] }))
  tools(on, 'no')

  await $.tool.call({ tool: 'Edit', file_path: '/r/a.ts', old_string: 'x', new_string: 'y' })
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  await clock.advance(250)
  expect(status.at(-1)).toBe('ctx 20%')
})

test('barra di stato: un errore non rompe la chiamata', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', () => ({ deny: 'no' }))
  on('agent.list', () => ({ value: [] }))
  tools(on)

  const ran = await $.tool.call({ tool: 'Bash', command: 'ls' })
  await clock.advance(250)
  expect(ran.deny).toBeUndefined()
})

/** What leaves the pane when the work ends: toasts, notifications and chimes. */
function outside(on: On) {
  const said = { toasts: [] as string[], notes: [] as { text: string; title?: string }[], sounds: 0 }
  on('ui.toast', (_, e) => {
    said.toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.notify', (_, e) => {
    said.notes.push({ text: e.text, title: e.title })
    return { value: { isSent: true, channel: 'terminal_bell' } }
  })
  on('audio.play', () => {
    said.sounds++
    return { value: undefined }
  })
  return said
}

/** A main turn of `seconds` that edits `files` files and costs from 0.50 to `cost` dollars. */
async function work($: Engine, on: On, seconds: number, files = 0, reason: 'answer' | 'aborted' | 'error' = 'answer') {
  let cost = 0.5
  on('session.usage', () => ({ value: usage({ cost: { usd: cost } }) }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('tool.call', () => ({ result: {}, text: '' }))
  await $.turn.start({ text: 'vai', turnId: 't' })
  for (let i = 0; i < files; i++) await $.tool.call({ tool: 'Write', file_path: `/r/f${i}.ts`, content: '' })
  cost = 0.62
  await $.turn.complete({ ...closed('ok', undefined, spent(10, 10, 100, 0)), durationMs: seconds * 1000, reason, isAborted: reason === 'aborted' })
}

test('fine lavoro: una riga accesa in verde, poi quieta fino al turno dopo', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  host(on)
  on('agent.list', () => ({ value: [] }))
  outside(on)
  await work($, on, 95, 2)

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })
    const line = await ui.find({ type: 'Text', text: /^✓ Lavoro finito/ })
    expect(line?.text).toMatch(/^✓ Lavoro finito alle \d\d:\d\d · 1m35 · 2 file · \+0\.12 \$$/)
    expect(line?.props.bold).toBe(true)
    expect(line?.props.color).toBe(GREEN)
    await ui.unmount()
  }

  await clock.advance(7_000)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const line = await ui.find({ type: 'Text', text: /^✓ Lavoro finito/ })
  expect(line?.props.bold).toBe(false)
  expect(line?.props.color).toBe('#90A4AE')
  await ui.unmount()
})

test('fine lavoro: un turno lungo avvisa con toast, notifica e suono', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('agent.list', () => ({ value: [running('a1')] }))
  const said = outside(on)
  await work($, on, 42, 1)

  expect(said.toasts).toEqual(['✓ Lavoro finito · 42s · 1 file · +0.12 $ · 1 subagent ancora attivi'])
  expect(said.notes).toEqual([{ text: '42s · 1 file · +0.12 $ · 1 subagent ancora attivi', title: 'Claude: lavoro finito' }])
  expect(said.sounds).toBe(1)
})

test('fine lavoro: un turno breve resta nel pannello, senza avvisi', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('agent.list', () => ({ value: [] }))
  const said = outside(on)
  await work($, on, 12)

  expect(said).toEqual({ toasts: [], notes: [], sounds: 0 })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^✓ Lavoro finito/ }))?.text).toMatch(/^✓ Lavoro finito alle \d\d:\d\d · 12s · \+0\.12 \$$/)
  await ui.unmount()
})

test('fine lavoro: interrotto, in rosso e senza avvisi', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('agent.list', () => ({ value: [] }))
  const said = outside(on)
  await work($, on, 300, 0, 'aborted')

  expect(said).toEqual({ toasts: [], notes: [], sounds: 0 })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /^■ Interrotto/ }))?.text).toMatch(/^■ Interrotto alle \d\d:\d\d · 5m00 · \+0\.12 \$$/)
  await ui.unmount()
})

test('fine lavoro: sempre, senza suono', { options: { notifyAfter: 'sempre', sound: false } }, async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('agent.list', () => ({ value: [] }))
  const said = outside(on)
  await work($, on, 3)

  expect(said.toasts).toEqual(['✓ Lavoro finito · 3s · +0.12 $'])
  expect(said.notes.length).toBe(1)
  expect(said.sounds).toBe(0)
})

test('fine lavoro: mai fuori dal pannello', { options: { notifyAfter: 'mai' } }, async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('agent.list', () => ({ value: [] }))
  const said = outside(on)
  await work($, on, 3_600)

  expect(said).toEqual({ toasts: [], notes: [], sounds: 0 })
})

test('fine lavoro: sparisce quando parte il turno dopo', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('agent.list', () => ({ value: [] }))
  outside(on)
  await work($, on, 40)
  await $.turn.start({ text: 'ancora', turnId: 't2' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Lavoro finito|lavoro finito/ })).toBeUndefined()
  await ui.unmount()
})

/** The strip's cells from a Raster's base64: each cell's character and foreground. */
function decode(cells: string): { char: string; fg: number }[] {
  const bytes = Uint8Array.from(atob(cells), c => c.charCodeAt(0))
  const view = new DataView(bytes.buffer)
  return Array.from({ length: bytes.length / 12 }, (_, i) => ({
    char: String.fromCodePoint(view.getUint32(i * 12, true)),
    fg: view.getUint32(i * 12 + 4, true),
  }))
}

/** The strip's colour runs, where the surface draws it as Text. */
async function runsOf(ui: { find: (query: { key: string }) => Promise<{ children: unknown[] } | undefined> }) {
  const strip = await ui.find({ key: 'strip' })
  const line = (strip?.children ?? [])[0] as { children?: unknown[] } | undefined
  return (line?.children ?? []).map(c => c as { props: { color?: string } })
}

test('striscia: corre avanti e indietro mentre lavora, poi resta verde', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  host(on)
  on('agent.list', () => ({ value: [] }))
  on('session.usage', () => ({ value: usage() }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))

  // Nothing yet: a dim line.
  let ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ key: 'strip' }))?.text).toBe('─'.repeat(60))
  await ui.unmount()

  await $.turn.start({ text: 'vai', turnId: 't' })
  const seen = new Set<string>()
  for (let i = 0; i < 8; i++) {
    ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
    const text = (await ui.find({ key: 'strip' }))?.text ?? ''
    expect(text.length).toBe(60)
    expect(text).toMatch(/^─*━+─*$/)
    seen.add(text)
    await ui.unmount()
    await clock.advance(200)
  }
  // It moved: eight frames over 1.6 s, one pass there and back.
  expect(seen.size).toBeGreaterThan(4)

  await $.turn.complete(closed('ok'))
  ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ key: 'strip' }))?.text).toBe('━'.repeat(60))
  expect((await runsOf(ui)).map(r => r.props.color)).toEqual([GREEN])
  await ui.unmount()
})

test('striscia: interrotto resta rossa', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('agent.list', () => ({ value: [] }))
  outside(on)
  await work($, on, 20, 0, 'aborted')

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await runsOf(ui)).map(r => r.props.color)).toEqual(['#EF9A9A'])
  await ui.unmount()
})

test('striscia: corre finché lavora un subagent, anche a turno finito', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  let list: AgentInfo[] = [running('a1')]
  on('agent.list', () => ({ value: list }))
  outside(on)
  await work($, on, 20)

  let ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ key: 'strip' }))?.text).toMatch(/^─*━+─*$/)
  await ui.unmount()

  list = [{ ...running('a1'), status: 'completed' }]
  ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  // The first draw sees the agent gone; the next one is solid.
  await ui.unmount()
  ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ key: 'strip' }))?.text).toBe('━'.repeat(60))
  await ui.unmount()
})

test('striscia sul terminale: ridisegnata in posto a ~30 fotogrammi, poi verde', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  host(on)
  on('agent.list', () => ({ value: [] }))
  on('session.usage', () => ({ value: usage() }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  const blits: string[] = []
  on('ui.blit', (_, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })

  await $.turn.start({ text: 'vai', turnId: 't' })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const raster = await ui.find({ key: 'strip' })
  expect(raster?.type).toBe('Raster')
  expect(raster?.props.columns).toBe(60)

  await clock.advance(33 * 30)
  expect(blits.length).toBeGreaterThanOrEqual(29)
  const frames = blits.map(decode)
  for (const f of frames) expect(f.length).toBe(60)
  // The brightest cell is the light: it travels.
  const heads = new Set(frames.map(f => f.findIndex(c => c.fg === 0xff5252)))
  expect(heads.size).toBeGreaterThan(10)

  await $.turn.complete(closed('ok'))
  await clock.advance(33 * 3)
  const after = blits.length
  await clock.advance(33 * 10)
  expect(blits.length).toBe(after)
  await ui.unmount()

  const done = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const solid = decode(String((await done.find({ key: 'strip' }))?.props.cells))
  expect(solid.every(c => c.char === '━' && c.fg === 0x81c784)).toBe(true)
  await done.unmount()
})
