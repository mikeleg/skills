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
/** What a compaction leaves: one message. */
const SUMMARY = [{ role: 'user' as const, text: 'riassunto', toolUses: [] }]

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
    expect((await ui.find({ type: 'Text', text: /\$$/ }))?.text).toBe('totale   0.50 $')
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
    expect((await ui.find({ type: 'Text', text: /■/ }))?.text).toBe('      ■ messaggi 60k   30%')
    // Only schemas inside the window count; at 40 rows both sections show, no tab to press.
    expect(await ui.find({ key: 'tab-token' })).toBeUndefined()
    expect((await ui.find({ type: 'Text', text: /^MCP/ }))?.text).toBe('MCP      Gmail  6k')
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
    // The projection at the reset, at the pace so far: 90% in 2h45 of 5 hours, 30% in 92 hours of 168.
    expect(five).toMatch(new RegExp(`^5 ore {4}━{14}─{2}  90% →164%  ◷ {4}2h15  ${DAY}$`))
    expect(week).toMatch(new RegExp(`^7 giorni ━{5}─{11}  30%  →55%  ◷ {3}3g 4h  ${DAY}$`))
    expect((await ui.find({ type: 'Text', text: /^Spesa/ }))?.text).toBe(`Spesa    ${'━'.repeat(10)}${'─'.repeat(6)}  65%${' '.repeat(8)}◷ n/d`)
    // Past 100% and already close: red; within the window: quiet.
    expect((await ui.find({ type: 'Text', text: /^ →164%$/ }))?.props.color).toBe('#EF9A9A')
    expect((await ui.find({ type: 'Text', text: /^ {2}→55%$/ }))?.props.color).toBe('#90A4AE')
    // The window that runs out first, and how long before its reset: 10% left at 90% in 2h45 is 18 minutes.
    expect((await ui.find({ type: 'Text', text: /^⚠/ }))?.text).toMatch(new RegExp(`^⚠ 5 ore finisce ${DAY} · 1h57 prima del reset$`))
    // The two resets start, count and end in the same columns.
    expect(week.indexOf('◷')).toBe(five.indexOf('◷'))
    expect(week.length).toBe(five.length)
    await ui.unmount()
  }
})

test('limiti: il reset settimanale ricordato quando la lettura non lo porta', async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.store(on, { resets: { seven_day: new Date(NOW + 26 * 3_600_000).toISOString() } })
  host(on)
  let limits: SessionUsage['rateLimits'] = [{ kind: 'five_hour', percentUsed: 12, resetsAt: new Date(NOW + 3_600_000).toISOString() }]
  on('session.usage', () => ({ value: usage({ rateLimits: limits }) }))
  on('agent.list', () => ({ value: [] }))
  on('session.start', () => ({ cwd: '/r' }))
  on('command.register', () => ({ value: { command: 'cruscotto' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.close', () => ({ value: undefined }))
  on('ui.status', () => ({ value: undefined }))
  await $.session.start({ cwd: '/r', surface: 'terminal', isInteractive: true })

  // Not reported at all: the row stays, with the reset it last had.
  let ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^7 giorni/ }))?.text).toMatch(/^7 giorni ─{16} {4}– {8}◷ {2}≈1g 2h {2}\S+ \d\d:\d\d$/)
  await ui.unmount()

  // Reported without a reset: the percentage is the reading's, the reset the remembered one.
  limits = [...limits, { kind: 'seven_day', percentUsed: 40 }]
  ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^7 giorni/ }))?.text).toMatch(/  40%  →47%  ◷ {2}≈1g 2h  /)
  await ui.unmount()
})

test('limiti: passato il reset ricordato, la settimana avanza di sette giorni', async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.store(on, { resets: { seven_day: new Date(NOW - 3_600_000).toISOString() } })
  host(on)
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: [] }))
  on('session.start', () => ({ cwd: '/r' }))
  on('command.register', () => ({ value: { command: 'cruscotto' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.close', () => ({ value: undefined }))
  on('ui.status', () => ({ value: undefined }))
  await $.session.start({ cwd: '/r', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
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

/** A coloured run inside a row: a Text child of the row's Text. */
type Run = { props?: { color?: string }; children?: string[] }

/**
 * A session that starts with `day` in the store and the week at `used()`, 76 hours from its
 * reset; the result draws the pane and reads the row of today's share.
 */
async function todayRow($: Engine, on: On, day: { date: string; used: number; at: number }, used: () => number) {
  mock.clock(on, { now: NOW })
  mock.store(on, { day })
  host(on)
  const resetsAt = new Date(NOW + 76 * 3_600_000).toISOString()
  on('session.usage', () => ({ value: usage({ rateLimits: [{ kind: 'seven_day', percentUsed: used(), resetsAt }] }) }))
  on('agent.list', () => ({ value: [] }))
  on('session.start', () => ({ cwd: '/r' }))
  on('command.register', () => ({ value: { command: 'cruscotto' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.close', () => ({ value: undefined }))
  on('ui.status', () => ({ value: undefined }))
  await $.session.start({ cwd: '/r', surface: 'terminal', isInteractive: true })

  return async () => {
    const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
    const row = await ui.find({ type: 'Text', text: /^oggi/ })
    await ui.unmount()
    const share = (row?.children ?? []).map(c => c as Run).find(c => /^\d+%$/.test((c.children ?? []).join('')))
    return { text: row?.text, color: share?.props?.color }
  }
}

test('limiti: la quota di oggi sul limite settimanale, dal primo valore letto nel giorno', async ($, on) => {
  let used = 30
  // This morning the week was at 22%, with 79 hours to its reset: four days of use, ~20% each.
  const today = await todayRow($, on, { date: new Date(NOW).toDateString(), used: 22, at: NOW - 3 * 3_600_000 }, () => used)
  expect(await today()).toEqual({ text: 'oggi     8% di ~20% al giorno', color: '#80CBC4' })

  // Past the day's share: amber.
  used = 60
  expect(await today()).toEqual({ text: 'oggi     38% di ~20% al giorno', color: '#FFCC80' })
})

test('limiti: la quota riparte il giorno dopo, e quando la settimana si azzera', async ($, on) => {
  let used = 60
  // Yesterday's start is stale: today counts from what the week has reached, 40% left over four days.
  const today = await todayRow($, on, { date: new Date(NOW - 24 * 3_600_000).toDateString(), used: 22, at: NOW - 24 * 3_600_000 }, () => used)
  expect((await today()).text).toBe('oggi     0% di ~10% al giorno')
  used = 65
  expect((await today()).text).toBe('oggi     5% di ~10% al giorno')

  // The week reset: the count starts over.
  used = 4
  expect((await today()).text).toBe('oggi     0% di ~24% al giorno')
})

test('limiti: senza il limite settimanale niente quota di oggi né avviso', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', () => ({
    value: usage({ rateLimits: [{ kind: 'five_hour', percentUsed: 20, resetsAt: new Date(NOW + 2 * 3_600_000).toISOString() }] }),
  }))
  on('agent.list', () => ({ value: [] }))

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^5 ore/ }))?.text).toMatch(/  20%  →33%  ◷/)
  expect(await ui.find({ type: 'Text', text: /^oggi/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^⚠/ })).toBeUndefined()
  await ui.unmount()
})

test('limiti: nessuna proiezione a finestra appena aperta', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  // 3% in the first 15 minutes of 5 hours would read as 60%: too early to say.
  on('session.usage', () => ({
    value: usage({ rateLimits: [{ kind: 'five_hour', percentUsed: 3, resetsAt: new Date(NOW + 4.75 * 3_600_000).toISOString() }] }),
  }))
  on('agent.list', () => ({ value: [] }))

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^5 ore/ }))?.text).toMatch(/   3% {8}◷/)
  await ui.unmount()
})

/** A context of seven categories, 200k in all. */
function sevenParts(on: On, percent: () => number) {
  const sizes = [['Messages', 80_000], ['System tools', 40_000], ['MCP tools', 20_000], ['Skills', 20_000], ['Memory files', 20_000], ['Custom agents', 10_000], ['System prompt', 10_000]] as const
  on('session.usage', (_, e) => ({
    value: usage({
      context: {
        tokens: percent() * 2_000, window: 200_000, percent: percent(),
        breakdown: e?.breakdown === undefined ? undefined : {
          categories: sizes.map(([name, tokens]) => ({ name, tokens, color: 'x', isDeferred: false, kind: 'used' })),
          mcpTools: [],
        } as never,
      },
    }),
  }))
}

/** The context bar's filled runs: each one's colour and cells. */
async function ctxRuns($: Engine) {
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const line = await ui.find({ type: 'Text', text: /^ctx/ })
  await ui.unmount()
  return (line?.children ?? [])
    .map(c => ({ color: (c as Run).props?.color, cells: ((c as Run).children ?? []).join('') }))
    .filter(r => r.cells.startsWith('━'))
    .map(r => ({ color: r.color, cells: r.cells.length }))
}

test('contesto: le categorie oltre la quinta hanno il loro segmento e la loro riga', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  sevenParts(on, () => 100)
  on('agent.list', () => ({ value: [] }))
  await measure($, on)

  // Each segment its own share of the 30 cells: the fifth does not take what the hidden two hold.
  expect((await ctxRuns($)).map(r => r.cells)).toEqual([12, 6, 3, 3, 3, 3])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /■ altro/ }))?.text).toBe('      ■ altro    20k   10%')
  await ui.unmount()
})

test('contesto: la barra divisa scorre una volta per ridisegno e pulsa mentre il turno lavora', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  host(on)
  let percent = 20
  sevenParts(on, () => percent)
  on('agent.list', () => ({ value: [] }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  await measure($, on)

  const cells = async () => (await ctxRuns($)).reduce((n, r) => n + r.cells, 0)
  expect(await cells()).toBe(6)
  percent = 80
  // A third of the way from 20 to 80: 41%, 12 cells of 30.
  expect(await cells()).toBe(12)

  await $.turn.start({ text: 'vai', turnId: 't' })
  const heads = new Set<string | undefined>()
  for (let i = 0; i < 2; i++) {
    heads.add((await ctxRuns($)).at(-1)?.color)
    await clock.advance(1_000)
  }
  expect(heads.has('#E0F2F1')).toBe(true)
})

/** A main turn at work, and the pane redraws the mod asks for. */
async function atWork($: Engine, on: On) {
  host(on)
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: [] }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('ui.blit', () => ({ value: {} }))
  const seen = { redraws: 0 }
  on('ui.invalidate', () => {
    seen.redraws++
    return { value: undefined }
  })
  await $.turn.start({ text: 'vai', turnId: 't' })
  return seen
}

test('ridisegni: sul terminale una volta al secondo mentre lavora, la striscia va da sé', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const seen = await atWork($, on)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await clock.advance(500)
  expect(seen.redraws).toBe(0)
  await clock.advance(600)
  expect(seen.redraws).toBe(1)
  await ui.unmount()
})

test('ridisegni: fitti dove la striscia vive dei ridisegni del pannello', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const seen = await atWork($, on)

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await clock.advance(500)
  expect(seen.redraws).toBeGreaterThanOrEqual(3)
  await ui.unmount()
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
  // A subagent's prompt is not the main loop's cache: it changes neither the rate nor what was read.
  await $.turn.complete(closed('', 'a1', spent(300_000, 10, 50_000, 0)))

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /^cache/ }))?.text).toBe(`cache    ${'━'.repeat(24)}${'─'.repeat(3)} 90% hit · 90k letti`)
    expect((await ui.find({ type: 'Text', text: /^turno/ }))?.text).toBe('turno    +0.12 $  ↓100k ↑1k · cache 90%')
    expect((await ui.find({ type: 'Text', text: /cache calda/ }))?.text).toBe('         ◷ cache calda ancora 5:00')
    await ui.unmount()
  }

  await clock.advance(4 * 60_000 + 30_000)
  let ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /cache calda/ }))?.text).toBe('         ◷ cache calda ancora 0:30')
  await ui.unmount()

  await clock.advance(60_000)
  ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /scaduta/ }))?.text).toBe('         ⚠ cache scaduta: il prossimo turno riscrive ~92k')
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
  expect((await ui.find({ type: 'Text', text: /cache calda/ }))?.text).toBe('         ◷ cache calda ancora 30:00')
  await ui.unmount()
})

test('dove vanno i token: solo il thread principale', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: [] }))
  const outputs: Record<string, string> = { Bash: 'x'.repeat(48_000), Read: 'y'.repeat(4_000) }
  on('tool.call', (_, e) => ({ result: {}, text: e.agentId === undefined ? outputs[e.tool] ?? '' : 'z'.repeat(400_000) }))

  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  for (let i = 0; i < 4; i++) await $.tool.call({ tool: 'Read', file_path: '/r/src/register.tsx' })
  // A subagent's outputs stay in its own context.
  await $.tool.call({ tool: 'Bash', command: 'find /', agentId: 'a1' })
  for (let i = 0; i < 3; i++) await $.tool.call({ tool: 'Read', file_path: '/r/src/register.tsx', agentId: 'a1' })

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: /Dove vanno i token/ })).toBeDefined()
    expect((await ui.find({ type: 'Text', text: /^output/ }))?.text).toBe('output   Bash  12k  ×1')
    expect((await ui.find({ type: 'Text', text: /^ +Read/ }))?.text).toBe('         Read   4k  ×4')
    expect((await ui.find({ type: 'Text', text: /^riletti/ }))?.text).toBe('riletti  register.tsx  ×4')
    await ui.unmount()
  }
})

test('sezioni: costo e token insieme, senza schede, quando il pannello ha le righe', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: [] }))
  on('tool.call', () => ({ result: {}, text: 'x'.repeat(4_000) }))
  await $.tool.call({ tool: 'Bash', command: 'ls' })

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: /^Costo e cache$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Dove vanno i token$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^totale/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^output/ })).toBeDefined()
    expect(await ui.find({ key: 'tab-token' })).toBeUndefined()
    await ui.unmount()
  }
})

test('sotto-schede in un pannello corto: costo e cache di default, i token con la scheda 2', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: [] }))
  on('tool.call', () => ({ result: {}, text: 'x'.repeat(4_000) }))
  await $.tool.call({ tool: 'Bash', command: 'ls' })

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface, props: { ...PANE.props, scroll: { offset: 0, bodyRows: 12 } } })
    expect(await ui.find({ type: 'Text', text: /^totale/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^output/ })).toBeUndefined()
    await ui.press({ key: 'tab-token' })
    expect(await ui.find({ type: 'Text', text: /^output/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^totale/ })).toBeUndefined()
    await ui.press({ key: 'tab-costo' })
    expect(await ui.find({ type: 'Text', text: /^totale/ })).toBeDefined()
    await ui.unmount()
  }
})

test('dove vanno i token: quello che il modello scrive', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: [] }))
  on('tool.call', () => ({ result: {}, text: 'ok' }))

  await $.tool.call({ tool: 'Write', file_path: '/r/a.ts', content: 'w'.repeat(36_000) })
  await $.tool.call({ tool: 'Edit', file_path: '/r/a.ts', old_string: 'w', new_string: 'e'.repeat(12_000) })
  await $.tool.call({ tool: 'Write', file_path: '/r/b.ts', content: 'w'.repeat(80_000), agentId: 'a1' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^scritto/ }))?.text).toBe('scritto  Write  9k  ×1')
  expect((await ui.find({ type: 'Text', text: /^ +Edit +3k/ }))?.text).toBe('         Edit   3k  ×1')
  await ui.unmount()
})

test('dove vanno i token: il peso di un output rimandato a ogni richiesta, finché la compattazione lo toglie', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: [] }))
  const outputs: Record<string, string> = { Bash: 'x'.repeat(32_000), Read: 'y'.repeat(8_000), Grep: 'g'.repeat(100) }
  on('tool.call', (_, e) => ({ result: {}, text: outputs[e.tool] ?? '' }))
  on('session.compact', () => ({ messages: SUMMARY }))
  const step = stepper($, on)

  await step(undefined, 'high')
  await $.tool.call({ tool: 'Bash', command: 'npm test -- --verbose' })
  await $.tool.call({ tool: 'Read', file_path: '/r/a.ts' })
  await $.tool.call({ tool: 'Grep', pattern: 'x' })
  // A subagent's requests do not send the main context again.
  for (let i = 0; i < 5; i++) await step('a1', 'low')
  for (let i = 0; i < 10; i++) await step(undefined, 'high')

  let ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^peso/ }))?.text).toBe('peso     Bash npm test -- --verbose  8k ×10 ≈80k')
  expect((await ui.find({ type: 'Text', text: /tutti/ }))?.text).toBe('         tutti ≈100k')
  await ui.unmount()

  // A subagent's compaction leaves the main context as it was.
  await $.session.compact({ trigger: 'auto', messages: SUMMARY, agentId: 'a1' })
  ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /^peso/ })).toBeDefined()
  await ui.unmount()

  await $.session.compact({ trigger: 'manual', messages: SUMMARY })
  ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /^peso/ })).toBeUndefined()
  // What happened stays counted.
  expect((await ui.find({ type: 'Text', text: /^output/ }))?.text).toBe('output   Bash  8k  ×1')
  expect((await ui.find({ type: 'Text', text: /^ +Grep/ }))?.text).toBe('         Grep  25  ×1')
  await ui.unmount()
})

test('dove vanno i token: la traccia del contesto turno per turno, la compattazione in viola', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  let ctx = 20_000
  on('session.usage', () => ({ value: usage({ context: { tokens: ctx, window: 200_000, percent: Math.round(ctx / 2_000) } }) }))
  on('agent.list', () => ({ value: [] }))
  on('turn.complete', () => ({ text: '' }))
  on('session.compact', () => ({ messages: SUMMARY }))

  await $.turn.complete(closed('1'))
  let ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  // One turn is not a trace yet.
  expect(await ui.find({ type: 'Text', text: /^turni/ })).toBeUndefined()
  await ui.unmount()

  for (const next of [60_000, 70_000, 130_000, 190_000]) {
    ctx = next
    await $.turn.complete(closed('n'))
  }
  ctx = 30_000
  await $.session.compact({ trigger: 'auto', messages: SUMMARY })
  await $.turn.complete(closed('dopo'))

  for (const surface of SURFACES) {
    const view = await $.ui.mount({ ...PANE, surface })
    const trace = await view.find({ type: 'Text', text: /^turni/ })
    expect(trace?.text).toBe('turni    ▁▃▃▆█▂ −160k')
    const colors = (trace?.children ?? []).slice(1, -1).map(c => (c as { props: { color?: string } }).props.color)
    expect(colors).toEqual(['#80CBC4', '#FFCC80', '#EF9A9A', '#B39DDB'])
    await view.unmount()
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
    expect((await ui.find({ type: 'Text', text: /cache in uso/ }))?.text).toMatch(new RegExp(`^ {9}${ORBIT} cache in uso$`))
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
  expect(await ui.find({ type: 'Text', text: /task d7$/ })).toBeUndefined()
  expect((await ui.find({ type: 'Text', text: /terminati/ }))?.text).toBe('+7 terminati')
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
  await $.turn.complete(closed('', 'a1', spent(90_000, 100, 0, 0)))
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

/** The hover card of a row: hidden until the pointer is over the row, the whole text inside. */
async function card(ui: { find: (query: { type: string; text: RegExp }) => Promise<{ text: string } | undefined> }, text: RegExp) {
  return (await ui.find({ type: 'Text', text }))?.text
}

test('tooltip: una descrizione tagliata si legge intera al passaggio del puntatore', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', () => ({ value: usage() }))
  const long = 'Explore the repository and list every place where the mod reads usage, with file and line'
  on('agent.list', () => ({ value: [{ ...running('a1'), description: long }, { ...running('a2'), description: 'corto' }] }))

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })
    const full = await ui.find({ type: 'Text', text: new RegExp(`^${long}\\n`) })
    expect(full?.text).toMatch(/\ngeneral-purpose · – · effort – · – · – token$/)
    // The card is hidden, drawn last over the rows: hovering the row reveals it.
    const box = await ui.find({ type: 'Box', text: new RegExp(`^${long}\\n`) })
    expect(box?.props.display).toBe('none')
    expect(box?.props.position).toBe('absolute')
    // Placed under its row: the agent rows are the last ones, so the card goes above when it does not fit below.
    expect(typeof box?.props.top).toBe('number')
    // A row that fits has no card.
    expect(await card(ui, /^corto\n/)).toBeUndefined()
    await ui.unmount()
  }
})

test('tooltip: i riassunti mostrano tutto, terminati e server MCP', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', (_, e) => ({
    value: usage({
      context: {
        tokens: 40_000, window: 200_000, percent: 20,
        breakdown: e?.breakdown === undefined ? undefined : {
          categories: [{ name: 'MCP tools', tokens: 12_000, color: 'x', isDeferred: false, kind: 'used' }],
          mcpTools: ['Gmail', 'Drive', 'Calendar', 'Gamma'].map((serverName, i) => ({ name: `mcp__${i}`, serverName, tokens: 4_000 - i * 500, isLoaded: true })),
        } as never,
      },
    }),
  }))
  const done = (n: number): AgentInfo => ({ ...running(`d${n}`), status: 'completed' })
  on('agent.list', () => ({ value: [done(1), done(2), done(3), done(4), done(5), done(6), done(7)] }))
  await measure($, on)

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /^MCP/ }))?.text).toBe('MCP      Gmail  4k')
    expect((await ui.find({ type: 'Text', text: /altri$/ }))?.text).toBe('         +2 altri')
    expect(await card(ui, /^Gmail 4k\n/)).toBe('Gmail 4k\nDrive 4k\nCalendar 3k\nGamma 3k')
    expect(await card(ui, /^✓ task d2\n/)).toBe('✓ task d2\n✓ task d1')
    // Each card right under its row: with both sections shown '+2 altri' is row 17, '+2 terminati' row 25.
    expect((await ui.find({ type: 'Box', text: /^Gmail 4k\n/ }))?.props.top).toBe(18)
    expect((await ui.find({ type: 'Box', text: /^✓ task d2\n/ }))?.props.top).toBe(26)
    await ui.unmount()
  }
})

test('tooltip: vicino al fondo del pannello la scheda si apre sopra la riga', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', () => ({ value: usage() }))
  const done = (n: number): AgentInfo => ({ ...running(`d${n}`), status: 'completed' })
  on('agent.list', () => ({ value: [done(1), done(2), done(3), done(4), done(5), done(6), done(7)] }))

  // 14 rows: no finished agent fits, '+7 terminati' is the last row (14); its card of seven lines goes above.
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal', props: { ...PANE.props, scroll: { offset: 0, bodyRows: 14 } } })
  const hiddenCard = await ui.find({ type: 'Box', text: /^✓ task d7\n/ })
  expect(hiddenCard?.text).toBe(['d7', 'd6', 'd5', 'd4', 'd3', 'd2', 'd1'].map(d => `✓ task ${d}`).join('\n'))
  expect(hiddenCard?.props.top).toBe(14 - 9)
  await ui.unmount()
})
