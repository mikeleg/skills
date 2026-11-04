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
      stdout: branch === null ? '' : `${branch}
`,
      stderr: '',
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }))
}

/** One session.measure: the moment the mod reads git. */
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

test('contesto: barra e token', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', () => ({ value: usage({ context: { tokens: 160_000, window: 200_000, percent: 80 } }) }))
  on('agent.list', () => ({ value: [] }))

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /160k \/ 200k token/ }))?.text).toContain('80%')
    await ui.unmount()
  }
})

test('limite quasi esaurito: percentuale e reset', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  const resetsAt = new Date(NOW + (2 * 60 + 15) * 60_000).toISOString()
  on('session.usage', () => ({
    value: usage({
      rateLimits: [
        { kind: 'five_hour', percentUsed: 90, resetsAt },
        { kind: 'seven_day', percentUsed: 30 },
        { kind: 'spend_limit', percentUsed: 65, resetsAt: new Date(NOW + (3 * 24 + 4) * 3_600_000).toISOString() },
      ],
    }),
  }))
  on('agent.list', () => ({ value: [] }))

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /^5 ore/ }))?.text).toMatch(/^5 ore {4}━{11}─ {2}90% {2}◷ 2h15 \(\d\d:\d\d\)$/)
    expect((await ui.find({ type: 'Text', text: /^7 giorni/ }))?.text).toMatch(/^7 giorni ━{4}─{8} {2}30% {2}◷ n\/d$/)
    expect((await ui.find({ type: 'Text', text: /^Spesa/ }))?.text).toMatch(
      /^Spesa {4}━{8}─{4} {2}65% {2}◷ 3g 4h \((lun|mar|mer|gio|ven|sab|dom) \d\d:\d\d\)$/,
    )
    await ui.unmount()
  }
})

test('nessuna lettura: limiti, modello e token non disponibili', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200_000 }, rateLimits: [] } }))
  on('agent.list', () => ({ value: [] }))

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: /^non disponibile \(nessuna lettura ancora\)$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Modello: non disponibile · effort non disponibile$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Token: non disponibile \(finestra 200k\)$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Costo sessione: non disponibile$/ })).toBeDefined()
    await ui.unmount()
  }
})

test('subagent: tempi di esecuzione e stato', async ($, on) => {
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
    expect((await ui.find({ type: 'Text', text: /^Subagent/ }))?.text).toBe('Subagent 2 attivi · 2 totali')
    expect((await ui.find({ type: 'Text', text: /task a1/ }))?.text).toBe('● opus low     6m  task a1')
    expect((await ui.find({ type: 'Text', text: /task a2/ }))?.text).toBe('● opus –       1m  task a2')
    await ui.unmount()
  }

  // Once one finishes its elapsed time stops.
  list = [running('a1'), { ...running('a2'), status: 'completed' }]
  await $.turn.complete({
    answer: '', durationMs: 0, isAborted: false, turnId: 't', agentId: 'a2', reason: 'answer',
  })
  await clock.advance(10 * 60_000)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /task a2/ }))?.text).toBe('✓ opus –       1m  task a2')
  await ui.unmount()
})

test('il modello principale arriva dal turno completato', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: [] }))
  on('turn.complete', () => ({ text: '' }))

  await $.turn.complete({
    answer: 'ok', durationMs: 10, isAborted: false, turnId: 't1', reason: 'answer',
    usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, model: 'claude-sonnet-4-5' },
  })

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /^Modello:/ }))?.text).toBe('Modello: sonnet · effort non disponibile')
  await ui.unmount()
})

test('prima riga: branch', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on, 'feature/x', 'C:\Repos\Demo')
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: [] }))

  await measure($, on)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /feature\/x/ }))?.text).toBe('⎇ feature/x')
    expect(await ui.find({ type: 'Text', text: /^Demo$/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('prima riga: senza git, cartella con slash', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on, null, '/home/me/demo/')
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: [] }))

  await measure($, on)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^demo$/ }))?.text).toBe('demo')
  await ui.unmount()
})

test('effort principale dal turn.step, non da quello dei subagent', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: [] }))
  const step = stepper($, on)

  const before = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await before.find({ type: 'Text', text: /^Modello:/ }))?.text).toBe('Modello: non disponibile · effort non disponibile')
  await before.unmount()

  await step('a1', 'low')
  await step(undefined, 'high')
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /^Modello:/ }))?.text).toBe('Modello: non disponibile · effort high')
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
    await $.turn.complete({
      answer: 'ok', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer',
      usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, model: id },
    })
    const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
    expect((await ui.find({ type: 'Text', text: /^Modello:/ }))?.text).toBe(`Modello: ${shown} · effort non disponibile`)
    await ui.unmount()
  }
})

test('subagent: attivi prima, al massimo 5 terminati', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', () => ({ value: usage() }))
  const done = (n: number): AgentInfo => ({ ...running(`d${n}`), status: n % 2 ? 'failed' : 'completed' })
  on('agent.list', () => ({ value: [done(1), done(2), done(3), done(4), done(5), done(6), done(7), running('w')] }))

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^Subagent/ }))?.text).toBe('Subagent 1 attivi · 8 totali')
  expect((await ui.find({ type: 'Text', text: /task w$/ }))?.text).toBe(`● – –${' '.repeat(8)}–  task w`)
  expect((await ui.find({ type: 'Text', text: /task d7$/ }))?.text).toBe(`✗ – –${' '.repeat(8)}–  task d7`)
  expect(await ui.find({ type: 'Text', text: /task d3$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /task d2$/ })).toBeUndefined()
  expect((await ui.find({ type: 'Text', text: /terminati/ }))?.text).toBe('+2 terminati')
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

const closed = (text: string): Parameters<Engine['turn']['complete']>[0] => ({
  answer: text, durationMs: 1, isAborted: false, turnId: 't', reason: 'answer',
  usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, model: 'claude-opus-5-5' },
})

test('barra di stato: modello, contesto, subagent, file e comandi', async ($, on) => {
  mock.clock(on, { now: NOW })
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
  await $.turn.complete(closed('ok'))
  // Two files, one of them edited twice and once by a subagent; two commands.
  await $.tool.call({ tool: 'Edit', file_path: '/r/a.ts', old_string: 'x', new_string: 'y' })
  await $.tool.call({ tool: 'Edit', file_path: '/r/a.ts', old_string: 'y', new_string: 'z', agentId: 'a1' })
  await $.tool.call({ tool: 'Write', file_path: '/r/b.ts', content: '' })
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  await $.tool.call({ tool: 'Bash', command: 'pwd', agentId: 'a2' })

  expect(status.at(-1)).toBe('opus · ctx 41% · agenti 3 sonnet, haiku · ✎2 ⚡2')
})

test('barra di stato: segmenti vuoti omessi', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  const status = statusLine(on)
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200_000 }, rateLimits: [] } }))
  on('agent.list', () => ({ value: [] }))
  tools(on)

  await measure($, on)
  expect(status.at(-1)).toBeUndefined()

  await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect(status.at(-1)).toBe('⚡1')

  await $.tool.call({ tool: 'Write', file_path: '/r/a.ts', content: '' })
  expect(status.at(-1)).toBe('✎1 ⚡1')
})

test('barra di stato: una chiamata rifiutata non conta', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  const status = statusLine(on)
  on('session.usage', () => ({ value: usage() }))
  on('agent.list', () => ({ value: [] }))
  tools(on, 'no')

  await $.tool.call({ tool: 'Edit', file_path: '/r/a.ts', old_string: 'x', new_string: 'y' })
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect(status.at(-1)).toBe('ctx 20%')
})

test('barra di stato: un errore non rompe la chiamata', async ($, on) => {
  mock.clock(on, { now: NOW })
  host(on)
  on('session.usage', () => ({ deny: 'no' }))
  on('agent.list', () => ({ value: [] }))
  tools(on)

  const ran = await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect(ran.deny).toBeUndefined()
})
