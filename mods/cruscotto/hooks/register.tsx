import { atom, read, update } from 'claude-code'
import type { AgentInfo, AgentStatus, EngineInterface, Register, RenderChildren, SessionRateLimit, Timer, TurnUsage } from 'claude-code'

import type { ContextShape, CruscottoAgent, DoneInfo, LiveOutput, TokenCounts, TokenLedger, ToolLedger } from '../types'

const PANE = 'cruscotto'
const NON_DISPONIBILE = 'non disponibile'

// The palette.
const HEADER = '#80CBC4'
const GLOW = '#E0F2F1'
const SECONDARY = '#90A4AE'
const BAR_EMPTY = '#455A64'
const AMBER = '#FFCC80'
const RED = '#EF9A9A'
const GREEN = '#81C784'
/** The running light, and the dark it fades into. */
const SCAN = '#FF5252'
const SCAN_DARK = '#3A2A2E'
/** The card a cut row shows on hover. */
const TIP_BG = '#263238'
/** The context bar's segments, largest category first. */
const SEGMENTS = [HEADER, '#B39DDB', AMBER, '#90CAF9', '#A5D6A7', SECONDARY]

const LIMIT_LABEL_WIDTH = 8
/** The time left before a reset, right-aligned: '≈6g 23h' at the widest. */
const RESET_WIDTH = 7
const WEEK_MS = 7 * 24 * 60 * 60_000
/** The `$.store` key of the last reset seen of each window. */
const RESETS_KEY = 'resets'
/** The windows that keep their row with a remembered reset when a reading leaves them out. */
const KEPT_LIMITS = ['five_hour', 'seven_day']
const BRANCH_REFRESH_MS = 30_000
const BREAKDOWN_REFRESH_MS = 60_000
const STATUS_DEBOUNCE_MS = 200
/** How long the cost of a turn just ended stays lit. */
const FLASH_MS = 3_000
/** Ticks: while something moves, while the cache counts down, and at rest. */
const TICK_FAST = 120
const TICK_SECOND = 1_000
const TICK_IDLE = 30_000
/** Ticks with no draw in between: the pane is not on screen, so slow down. */
const UNSEEN_TICKS = 4
/** A file read this many times is shown as read again. */
const REREAD_AT = 3
const TOP_TOOLS = 3
const TOP_REREADS = 2
const TOP_SEGMENTS = 5
/** Turns kept for the trace. */
const HISTORY_TURNS = 60
/** Outputs smaller than this are not weighed; at most LIVE_MAX are, the largest. */
const LIVE_MIN = 200
const LIVE_MAX = 300
const SPARK = '▁▂▃▄▅▆▇█'
/** The left column of the token rows. */
const ROW_LABEL = 10

/** How long the end-of-work line stays lit in the pane. */
const BANNER_MS = 6_000
const DONE_SOUND = 'sounds/done.wav'
/** The notify option: from which turn length the end is announced outside the pane. */
const NOTIFY_AFTER: Record<string, number> = { sempre: 0, '30s': 30_000, '2m': 120_000, mai: Infinity }
const DONE_LOOK: Record<DoneInfo['reason'], { icon: string; label: string; color: string }> = {
  answer: { icon: '✓', label: 'Lavoro finito', color: GREEN },
  refusal: { icon: '✓', label: 'Risposta data', color: GREEN },
  aborted: { icon: '■', label: 'Interrotto', color: RED },
  error: { icon: '✗', label: 'Fermato da un errore', color: RED },
}

// The strip: a light that runs back and forth while the work goes on, solid when it ends.
const STRIP_KEY = 'strip'
/** A frame of the strip on the terminal, repainted in place (about 30 a second). */
const STRIP_FRAME_MS = 33
/** One pass there and back. */
const SCAN_PERIOD_MS = 1_600
/** Lit cells behind the light, fading. */
const TRAIL = 7
/** Refused repaints in a row (the pane is not on screen): stop until the next draw. */
const BLIT_GIVE_UP = 30

const ZERO: TokenCounts = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

const model = atom({ plugin: 'cruscotto', key: 'model' } as const, null)
const effort = atom({ plugin: 'cruscotto', key: 'effort' } as const, null)
const branch = atom({ plugin: 'cruscotto', key: 'branch' } as const, { value: null, at: 0 })
// Change a tag when its type's fields change: it declines what an earlier
// version stored, which outlives a reload.
const agents = atom({ plugin: 'cruscotto', key: 'agents' } as const, {}, { shape: 'agents-3' })
const activity = atom({ plugin: 'cruscotto', key: 'activity' } as const, { files: [], commands: 0 })
const ledger = atom(
  { plugin: 'cruscotto', key: 'ledger' } as const,
  { total: ZERO, last: null, lastMainAt: null, history: [], compactedSince: false },
  { shape: 'ledger-2' },
)
const tools = atom(
  { plugin: 'cruscotto', key: 'tools' } as const,
  { byTool: {}, written: {}, reads: {}, requests: 0, live: [] },
  { shape: 'tools-2' },
)
const context = atom({ plugin: 'cruscotto', key: 'context' } as const, null, { shape: 'context-1' })
const done = atom({ plugin: 'cruscotto', key: 'done' } as const, null, { shape: 'done-1' })

type AgentRow = AgentInfo & Partial<CruscottoAgent>

const LIMIT_NAMES: Record<string, string> = {
  five_hour: '5 ore',
  seven_day: '7 giorni',
  spend_limit: 'Spesa',
}
/** /context's category names, shortened for the legend; any other keeps its own. */
const PART_NAMES: Record<string, string> = {
  'System prompt': 'sistema',
  'System tools': 'tool',
  'MCP tools': 'MCP',
  'Custom agents': 'agenti',
  'Memory files': 'memoria',
  Skills: 'skill',
  Messages: 'messaggi',
}
const WEEKDAYS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const ORBIT = ['◐', '◓', '◑', '◒']
const AGENT_ICONS: Record<AgentStatus, { icon: string; color: string }> = {
  running: { icon: '●', color: HEADER },
  pending: { icon: '◌', color: SECONDARY },
  waiting: { icon: '◌', color: SECONDARY },
  idle: { icon: '○', color: SECONDARY },
  completed: { icon: '✓', color: SECONDARY },
  failed: { icon: '✗', color: RED },
  killed: { icon: '■', color: RED },
}
const EFFORT_SHORT: Record<string, string> = { medium: 'med', xhigh: 'xh' }
const ACTIVE: AgentStatus[] = ['running', 'pending', 'waiting']
const MODEL_WIDTH_MAX = 10
const FINISHED_MAX = 5
const pad2 = (n: number) => String(n).padStart(2, '0')
const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n))

// What lives with the module alone: the animation's clock, never the data.
let cacheTtlMs = 5 * 60_000
let ticker: Timer | undefined
let tickMs = 0
let unseenTicks = 0
let mainRunning = false
let activeAgents = 0
let tweening = false
let flashUntil = 0
let cacheWarmUntil = 0
let costBefore: number | undefined
let statusTimer: Timer | undefined
const shown = new Map<string, number>()
let knownResets: Record<string, string> = {}
let bannerUntil = 0
let filesBefore = 0
let notifyAfterMs = NOTIFY_AFTER['30s'] as number
let isSoundOn = true
let blitTimer: Timer | undefined
let blitRefused = 0
let scanFrame = 0
let stripWidth = 0

function clockTime(iso: string): string {
  const d = new Date(iso)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function duration(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h${pad2(minutes % 60)}`
  return `${Math.floor(hours / 24)}g${hours % 24}h`
}

function countdown(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(seconds / 60)}:${pad2(seconds % 60)}`
}

/** 'claude-sonnet-4-5-20250929' -> 'sonnet': no version; aliases and unknown formats stay as they are. */
function shortModel(id: string): string {
  const stripped = id.replace(/^claude-/, '').replace(/\[[^\]]*\]$/, '').replace(/-\d{8}$/, '')
  const [, family] = /^([a-z]+)-\d+(?:-\d+)*$/.exec(stripped) ?? []
  return family ?? id
}

function tokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  return n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n))
}

function sum(c: TokenCounts): number {
  return c.input + c.output + c.cacheRead + c.cacheWrite
}

/** The share of the prompt the cache served; undefined before any prompt. */
function hitRate(c: TokenCounts): number | undefined {
  const prompt = c.input + c.cacheRead + c.cacheWrite
  return prompt === 0 ? undefined : Math.round((c.cacheRead / prompt) * 100)
}

function counts(u: TurnUsage): TokenCounts {
  return {
    input: u.input_tokens,
    output: u.output_tokens,
    cacheRead: u.cache_read_input_tokens,
    cacheWrite: u.cache_creation_input_tokens,
  }
}

function add(a: TokenCounts, b: TokenCounts): TokenCounts {
  return {
    input: a.input + b.input,
    output: a.output + b.output,
    cacheRead: a.cacheRead + b.cacheRead,
    cacheWrite: a.cacheWrite + b.cacheWrite,
  }
}

function threshold(percent: number): string {
  return percent >= 80 ? RED : percent >= 60 ? AMBER : HEADER
}

/** Eases what a bar shows toward its value, a third of the way each frame; the first sight is the value. */
function tween(key: string, target: number): number {
  const prev = shown.get(key)
  if (prev === undefined || Math.abs(target - prev) < 0.6) {
    shown.set(key, target)
    return target
  }
  const next = prev + (target - prev) * 0.35
  shown.set(key, next)
  tweening = true
  return next
}

/**
 * Every window's reset in the same columns: the time left right-aligned,
 * then the day and the hour. `≈` marks one remembered, not just reported.
 */
function resetText(resetsAt: string | undefined, now: number, isRemembered = false): string {
  if (resetsAt === undefined) return '◷ n/d'
  const minutes = Math.max(0, Math.round((Date.parse(resetsAt) - now) / 60_000))
  const hours = Math.floor(minutes / 60)
  const left = hours < 24 ? `${hours}h${pad2(minutes % 60)}` : `${Math.floor(hours / 24)}g ${hours % 24}h`
  const at = `${WEEKDAYS[new Date(resetsAt).getDay()]} ${clockTime(resetsAt)}`
  return `◷ ${`${isRemembered ? '≈' : ''}${left}`.padStart(RESET_WIDTH)}  ${at}`
}

/**
 * The reset to show for a window: the one reported, else the last one seen.
 * The weekly window rolls every seven days, so a past one moves on by weeks.
 */
function resetFor(kind: string, reported: string | undefined, now: number): { at?: string; isRemembered: boolean } {
  if (reported !== undefined) return { at: reported, isRemembered: false }
  const seen = knownResets[kind]
  if (seen === undefined) return { isRemembered: false }
  let at = Date.parse(seen)
  if (Number.isNaN(at)) return { isRemembered: false }
  if (kind === 'seven_day') while (at <= now) at += WEEK_MS
  return at > now ? { at: new Date(at).toISOString(), isRemembered: true } : { isRemembered: false }
}

/** Keeps each window's last reported reset, in the store, so the next session has it too. */
function rememberResets($: EngineInterface, limits: readonly SessionRateLimit[]): void {
  const fresh = limits.filter(l => l.resetsAt !== undefined && knownResets[l.kind] !== l.resetsAt)
  if (fresh.length === 0) return
  knownResets = { ...knownResets, ...Object.fromEntries(fresh.map(l => [l.kind, l.resetsAt as string])) }
  void $.store.set(RESETS_KEY, knownResets).catch(() => {})
}

function folderName(cwd: string): string {
  return cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd
}

function baseName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path
}

function clip(text: string, width: number): string {
  const line = text.replace(/\s+/g, ' ').trim()
  return line.length > width ? `${line.slice(0, width - 1)}…` : line
}

/** How fast the pane must redraw now. */
function wantedTick(now: number): number {
  if (unseenTicks >= UNSEEN_TICKS) return TICK_IDLE
  if (mainRunning || activeAgents > 0 || tweening || now < flashUntil) return TICK_FAST
  if (now < bannerUntil || (cacheWarmUntil > 0 && now < cacheWarmUntil + 60_000)) return TICK_SECOND
  return TICK_IDLE
}

/** Keeps one timer at the pace the pane needs; a redraw or an event calls it, a tick checks it. */
function schedule($: EngineInterface, now: number): void {
  const ms = wantedTick(now)
  if (ms === tickMs && ticker !== undefined) return
  ticker?.cancel()
  tickMs = ms
  ticker = $.clock.every(ms, () => {
    unseenTicks++
    $.ui.invalidate('ui.render')
    void $.clock.now().then(at => schedule($, at))
  })
}

/** Reads the git branch of the session's folder, at most every 30 seconds. */
async function refreshBranch($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  if (now - (await read($, branch)).at < BRANCH_REFRESH_MS) return
  const cwd = await $.session.cwd()
  const run = await $.process.run(['git', 'branch', '--show-current'], { cwd }).catch(() => undefined)
  const value = run?.exitCode === 0 && run.stdout.trim() !== '' ? run.stdout.trim() : null
  await update($, branch, () => ({ value, at: now }))
}

/** What fills the context, as /context's summary estimates it (local, no request), at most every minute. */
async function refreshContext($: EngineInterface, force = false): Promise<void> {
  try {
    const now = await $.clock.now()
    const known = await read($, context)
    if (!force && known !== null && now - known.at < BREAKDOWN_REFRESH_MS) return
    const { breakdown } = (await $.session.usage({ breakdown: 'summary', columns: 40 })).context
    if (breakdown === undefined) return
    const parts = breakdown.categories
      .filter(c => c.kind === 'used' && c.tokens > 0)
      .map(c => ({ name: c.name, tokens: c.tokens }))
      .sort((a, b) => b.tokens - a.tokens)
    const servers = new Map<string, number>()
    for (const t of breakdown.mcpTools) {
      if (t.isLoaded) servers.set(t.serverName, (servers.get(t.serverName) ?? 0) + t.tokens)
    }
    const mcp = [...servers].map(([server, n]) => ({ server, tokens: n })).sort((a, b) => b.tokens - a.tokens)
    await update($, context, (): ContextShape => ({ at: now, parts, mcp }))
  } catch {
    // The composition is a bonus: without it the bar is drawn whole.
  }
}

/** The always-visible line: model, context, cache, active subagents, files edited and commands run. */
async function refreshStatus($: EngineInterface): Promise<void> {
  try {
    const [mainModel, known, usage, list, { files, commands }, { total }, ended] = await Promise.all([
      read($, model),
      read($, agents),
      $.session.usage(),
      $.agent.list(),
      read($, activity),
      read($, ledger),
      read($, done),
    ])
    const active = list.filter(a => ACTIVE.includes(a.status))
    activeAgents = active.length
    const models = [...new Set(active.flatMap(a => known[a.id]?.model ?? []).map(shortModel))]
    const { percent } = usage.context
    const hit = hitRate(total)
    const segments = [
      ended === null || mainRunning ? '' : `${DONE_LOOK[ended.reason].icon} ${clockTime(new Date(ended.at).toISOString())}`,
      mainModel === null ? '' : shortModel(mainModel),
      percent === undefined ? '' : `ctx ${percent}%`,
      hit === undefined ? '' : `cache ${hit}%`,
      active.length === 0 ? '' : `agenti ${active.length}${models.length === 0 ? '' : ` ${models.join(', ')}`}`,
      [files.length > 0 ? `✎${files.length}` : '', commands > 0 ? `⚡${commands}` : ''].filter(Boolean).join(' '),
    ].filter(Boolean)
    await $.ui.status(segments.length === 0 ? undefined : segments.join(' · '))
  } catch {
    // The status line is a courtesy: it never gets in the way of the session.
  }
}

/** One status refresh for a burst of events, outside the hooks' own time. */
function statusSoon($: EngineInterface): void {
  statusTimer?.cancel()
  statusTimer = $.clock.after(STATUS_DEBOUNCE_MS, () => {
    statusTimer = undefined
    void refreshStatus($)
  })
}

/** What a tool's output is called in the pane: a file, a command, a pattern. */
function toolLabel(e: { tool: string } & Record<string, unknown>): string {
  const field = ['file_path', 'notebook_path', 'command', 'pattern', 'url', 'query', 'description']
    .map(k => e[k])
    .find((v): v is string => typeof v === 'string' && v !== '')
  if (field === undefined) return ''
  return /[\\/]/.test(field) && !/\s/.test(field) ? baseName(field) : field
}

type StripCell = { char: string; color: string }
type StripState = 'idle' | 'scan' | 'done' | 'stopped'

const isScanning = () => mainRunning || activeAgents > 0

function hex(color: string): [number, number, number] {
  const n = Number.parseInt(color.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** `a` to `b` by `t`, 0 to 1. */
function mix(a: string, b: string, t: number): string {
  const [x, y] = [hex(a), hex(b)]
  return `#${x.map((v, i) => Math.round(v + ((y[i] as number) - v) * t).toString(16).padStart(2, '0')).join('')}`
}

/**
 * The strip at time `t`: while scanning, a light that runs to one end and
 * back with a fading trail behind it; else solid green (done), solid red
 * (stopped) or a dim line (nothing yet).
 */
function stripCells(state: StripState, width: number, t: number): StripCell[] {
  if (state === 'done') return Array.from({ length: width }, () => ({ char: '━', color: GREEN }))
  if (state === 'stopped') return Array.from({ length: width }, () => ({ char: '━', color: RED }))
  const cells = Array.from({ length: width }, () => ({ char: '─', color: state === 'idle' ? BAR_EMPTY : SCAN_DARK }))
  if (state === 'idle' || width < 2) return cells
  const phase = (t % SCAN_PERIOD_MS) / SCAN_PERIOD_MS
  const isForward = phase < 0.5
  const head = Math.round((isForward ? phase * 2 : (1 - phase) * 2) * (width - 1))
  const behind = isForward ? -1 : 1
  for (let i = TRAIL; i >= -1; i--) {
    const at = head + behind * i
    if (at < 0 || at >= width) continue
    const glow = i === -1 ? 0.35 : i === 0 ? 1 : 0.85 * 0.68 ** (i - 1)
    cells[at] = { char: '━', color: mix(SCAN_DARK, SCAN, glow) }
  }
  return cells
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function base64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b, c] = [bytes[i] as number, bytes[i + 1], bytes[i + 2]]
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0)
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!
    out += b === undefined ? '=' : B64[(n >> 6) & 63]!
    out += c === undefined ? '=' : B64[n & 63]!
  }
  return out
}

/** The strip as a Raster's cells: little-endian [codePoint, foreground, background] per cell. */
function rasterCells(cells: StripCell[]): string {
  const bytes = new Uint8Array(cells.length * 12)
  const view = new DataView(bytes.buffer)
  cells.forEach((cell, i) => {
    view.setUint32(i * 12, cell.char.codePointAt(0) ?? 0x2500, true)
    view.setUint32(i * 12 + 4, Number.parseInt(cell.color.slice(1), 16), true)
    view.setUint32(i * 12 + 8, 0x01000000, true)
  })
  return base64(bytes)
}

/**
 * On the terminal the light runs at the frame rate: the mounted Raster is
 * repainted in place, no redraw of the pane. It stops itself once the work
 * ends (and redraws the pane solid) or while the pane is not on screen.
 */
function runStrip($: EngineInterface): void {
  if (blitTimer !== undefined) return
  blitRefused = 0
  blitTimer = $.clock.every(STRIP_FRAME_MS, () => {
    if (!isScanning() || blitRefused >= BLIT_GIVE_UP) {
      blitTimer?.cancel()
      blitTimer = undefined
      $.ui.invalidate('ui.render')
      return
    }
    scanFrame++
    void $.ui
      .blit({ requestId: PANE, key: STRIP_KEY, columns: stripWidth, rows: 1, cells: rasterCells(stripCells('scan', stripWidth, scanFrame * STRIP_FRAME_MS)) })
      .then(r => { blitRefused = r.deny === undefined ? 0 : blitRefused + 1 })
      .catch(() => { blitRefused++ })
  })
}

/** A turn's length to the second while short: '42s', '1m35', then as `duration` has it. */
function turnLength(ms: number): string {
  const seconds = Math.max(1, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m${pad2(seconds % 60)}`
  return duration(ms)
}

/** One line for the turn just ended: how long, what it touched, what it cost, who still works. */
function doneSummary(d: DoneInfo): string {
  return [
    turnLength(d.durationMs),
    d.files === 0 ? '' : `${d.files} file`,
    d.costUsd === undefined ? '' : `+${d.costUsd.toFixed(2)} $`,
    d.agents === 0 ? '' : `${d.agents} subagent ancora attivi`,
  ].filter(Boolean).join(' · ')
}

/** Says the work is over outside the pane: a toast, a native notification and a chime, for turns long enough. */
async function announce($: EngineInterface, d: DoneInfo): Promise<void> {
  if (d.reason === 'aborted' || d.durationMs < notifyAfterMs) return
  const { icon, label } = DONE_LOOK[d.reason]
  const text = `${label} · ${doneSummary(d)}`
  $.ui.toast(`${icon} ${text}`, { timeoutMs: 8_000 })
  await Promise.all([
    $.ui.notify(doneSummary(d), { title: `Claude: ${label.toLowerCase()}` }).catch(() => {}),
    isSoundOn && d.reason !== 'error' ? $.audio.play({ asset: DONE_SOUND }).catch(() => {}) : undefined,
  ])
}

/** What the model wrote into a tool's input: a Write's content, an Edit's new text, a notebook cell. */
function writtenText(input: Record<string, unknown>): string {
  for (const key of ['content', 'new_string', 'new_source']) {
    const value = input[key]
    if (typeof value === 'string') return value
  }
  return ''
}

/** One row of the token section: its label in a fixed column, then its parts. */
function rowLabel(label: string): string {
  return label.padEnd(ROW_LABEL)
}

export const register: Register = (on, options) => {
  cacheTtlMs = options.cacheTtl === '1h' ? 60 * 60_000 : 5 * 60_000
  notifyAfterMs = NOTIFY_AFTER[String(options.notifyAfter ?? '30s')] ?? (NOTIFY_AFTER['30s'] as number)
  isSoundOn = options.sound !== false

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'cruscotto',
      description: 'Apre il cruscotto: limiti, token, cache e subagent',
    })
    await refreshBranch($)
    void $.ui.open({ id: PANE, title: 'Cruscotto' })
    // The Contesto tab of an earlier version outlives a reload: close it once.
    void $.ui.close({ id: 'cruscotto-contesto' }).catch(() => {})
    const stored = await $.store.get(RESETS_KEY).catch(() => undefined)
    if (stored !== null && typeof stored === 'object') {
      knownResets = Object.fromEntries(Object.entries(stored).filter((kv): kv is [string, string] => typeof kv[1] === 'string'))
    }
    const { lastMainAt } = await read($, ledger)
    cacheWarmUntil = lastMainAt === null ? 0 : lastMainAt + cacheTtlMs
    tickMs = 0
    schedule($, await $.clock.now())
    void refreshContext($)
    await refreshStatus($)

    return next(e)
  })

  on('command.run', { command: 'cruscotto' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Cruscotto', focus: true })

    return { text: 'Cruscotto aperto.' }
  })

  on('session.measure', async ($, e, next) => {
    rememberResets($, e.rateLimits)
    await refreshBranch($)
    await refreshContext($)
    $.ui.invalidate('ui.render')
    statusSoon($)

    return next(e)
  })

  on('session.compact', async ($, e, next) => {
    const result = await next(e)
    // The main loop's context is now a summary: nothing of what it held is sent again.
    const isSkipped = 'skip' in result && typeof result.skip === 'string'
    if (e.agentId === undefined && e.trigger !== 'precompute' && !isSkipped) {
      try {
        await update($, tools, all => ({ ...all, live: [] }))
        await update($, ledger, l => ({ ...l, compactedSince: true }))
      } catch {}
    }
    await refreshContext($, true)

    return result
  })

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    const id = started.agentId
    if (id !== undefined) try {
      const startedAt = await $.clock.now()
      await update($, agents, all => ({
        ...Object.fromEntries(Object.entries(all).slice(-49)),
        [id]: { ...all[id], startedAt, model: started.model },
      }))
      activeAgents++
      schedule($, startedAt)
    } catch {}
    statusSoon($)

    return started
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    // Bookkeeping alone: whatever goes wrong here, the call's result stands.
    if (ran.deny === undefined) try {
      if (e.tool === 'Edit' || e.tool === 'Write') {
        const path = e.file_path
        await update($, activity, all =>
          all.files.includes(path) ? all : { ...all, files: [...all.files, path].slice(-200) },
        )
      } else if (e.tool === 'Bash') {
        await update($, activity, all => ({ ...all, commands: all.commands + 1 }))
      }
      // The main loop's context alone: a subagent's outputs never reach it.
      if (e.agentId === undefined) {
        const size = Math.round((ran.text?.length ?? 0) / 4)
        const wrote = Math.round(writtenText(e as unknown as Record<string, unknown>).length / 4)
        const readPath = e.tool === 'Read' ? e.file_path : undefined
        const label = toolLabel(e as unknown as { tool: string } & Record<string, unknown>)
        await update($, tools, (all): ToolLedger => {
          const was = all.byTool[e.tool] ?? { tokens: 0, calls: 0 }
          const wasWritten = all.written[e.tool] ?? { tokens: 0, calls: 0 }
          const reads = readPath === undefined ? all.reads : { ...all.reads, [readPath]: (all.reads[readPath] ?? 0) + 1 }
          let live = all.live
          if (size >= LIVE_MIN) {
            live = [...live, { tool: e.tool, label, tokens: size, at: all.requests }]
            if (live.length > LIVE_MAX) {
              const smallest = live.reduce((min, o, i) => (o.tokens < (live[min] as LiveOutput).tokens ? i : min), 0)
              live = live.filter((_, i) => i !== smallest)
            }
          }
          return {
            ...all,
            byTool: { ...all.byTool, [e.tool]: { tokens: was.tokens + size, calls: was.calls + 1 } },
            written: wrote === 0 ? all.written : { ...all.written, [e.tool]: { tokens: wasWritten.tokens + wrote, calls: wasWritten.calls + 1 } },
            reads: Object.keys(reads).length > 100 ? Object.fromEntries(Object.entries(reads).slice(-100)) : reads,
            live,
          }
        })
      }
    } catch {}
    statusSoon($)

    return ran
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      mainRunning = true
      bannerUntil = 0
      filesBefore = (await read($, activity)).files.length
      costBefore = (await $.session.usage().catch(() => undefined))?.cost?.usd
      statusSoon($)
      schedule($, await $.clock.now())
    }

    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) {
      try {
        await update($, tools, all => ({ ...all, requests: all.requests + 1 }))
      } catch {}
    }
    const level = e.effort
    if (level !== undefined) {
      const id = e.agentId
      if (id === undefined) {
        if ((await read($, effort)) !== level) await update($, effort, () => level)
      } else if ((await read($, agents))[id]?.effort !== level) {
        await update($, agents, all => ({ ...all, [id]: { ...all[id], effort: level } }))
      }
    }

    return yield* next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const id = e.agentId
    const now = await $.clock.now()
    const used = e.usage === undefined ? ZERO : counts(e.usage)
    if (id === undefined) {
      const reported = e.usage?.model
      if (reported !== undefined) await update($, model, () => reported)
    } else {
      await update($, agents, all => {
        const known = all[id]
        return known ? { ...all, [id]: { ...known, endedAt: now, tokens: (known.tokens ?? 0) + sum(used) } } : all
      })
    }
    const result = await next(e)
    if (id === undefined) {
      mainRunning = false
      const measured = await $.session.usage().catch(() => undefined)
      const after = measured?.cost?.usd
      const costUsd = after !== undefined && costBefore !== undefined ? Math.max(0, after - costBefore) : undefined
      const ctx = measured?.context.tokens
      await update($, ledger, (l): TokenLedger => ({
        total: add(l.total, used),
        last: e.usage === undefined ? l.last : { ...used, costUsd },
        lastMainAt: e.usage === undefined ? l.lastMainAt : now,
        history: ctx === undefined ? l.history : [...l.history, { ctx, compacted: l.compactedSince }].slice(-HISTORY_TURNS),
        compactedSince: ctx === undefined ? l.compactedSince : false,
      }))
      if (e.usage !== undefined) {
        cacheWarmUntil = now + cacheTtlMs
        flashUntil = now + FLASH_MS
      }
      const ended: DoneInfo = {
        at: now,
        durationMs: e.durationMs,
        reason: e.reason,
        files: Math.max(0, (await read($, activity)).files.length - filesBefore),
        costUsd,
        agents: (await $.agent.list().catch(() => [])).filter(a => ACTIVE.includes(a.status)).length,
      }
      await update($, done, () => ended)
      bannerUntil = now + BANNER_MS
      void announce($, ended)
    } else {
      await update($, ledger, l => ({ ...l, total: add(l.total, used) }))
    }
    schedule($, now)
    statusSoon($)

    return result
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const [usage, list, now, mainModel, known, cwd, mainEffort, cachedBranch, spent, out, shape, ended] = await Promise.all([
      $.session.usage(),
      $.agent.list(),
      $.clock.now(),
      read($, model),
      read($, agents),
      $.session.cwd(),
      read($, effort),
      read($, branch),
      read($, ledger),
      read($, tools),
      read($, context),
      read($, done),
    ])
    unseenTicks = 0
    tweening = false

    const width = Math.max(24, e.props.bodyColumns)
    const room = e.props.scroll?.bodyRows ?? e.viewport?.rows ?? 40
    const barCells = clamp(width - 22, 10, 30)
    const limitCells = clamp(width - 44, 6, 16)
    const tick = Math.floor(now / TICK_FAST)
    const pulse = Math.floor(now / 480) % 2 === 0

    const rows: AgentRow[] = list.map(a => ({ ...a, ...known[a.id] }))
    // Most recent first, the ones still working ahead of the finished.
    const recent = [...rows].reverse().sort((x, y) => (y.startedAt ?? -1) - (x.startedAt ?? -1))
    const active = recent.filter(a => ACTIVE.includes(a.status))
    const finished = recent.filter(a => !ACTIVE.includes(a.status))
    activeAgents = active.length
    const { tokens: used, window, percent } = usage.context

    /** A section's title, ruled to the pane's width. */
    const heading = (label: string, extra = '') => (
      <Box marginTop={1}>
        <Text wrap="truncate-end">
          <Text bold color={HEADER}>{label}</Text>
          <Text color={SECONDARY}>{extra}</Text>
          <Text color={BAR_EMPTY}>{` ${'─'.repeat(Math.max(2, width - label.length - extra.length - 1))}`}</Text>
        </Text>
      </Box>
    )
    /** A bar of `cells`, the head cell glowing while `live`. */
    const bar = (key: string, value: number, cells: number, color = threshold(value), live = false) => {
      const filled = clamp(Math.round((tween(key, value) / 100) * cells), 0, cells)
      const glow = live && filled > 0 && pulse
      return [
        <Text color={color}>{'━'.repeat(glow ? filled - 1 : filled)}</Text>,
        glow ? <Text color={GLOW}>━</Text> : '',
        <Text color={BAR_EMPTY}>{'─'.repeat(cells - filled)}</Text>,
      ]
    }

    /**
     * A row that may be cut (its `…`) or summed up (`+3`): `when` it is, the
     * pointer over it reveals a card with the whole of it. The cards are drawn
     * last, over everything, placed under their row (or above it, near the
     * bottom) once the rows are laid out. A surface with no pointer shows none.
     */
    const cards: { scope: string; full: string; node: RenderChildren }[] = []
    const tip = <T extends RenderChildren>(id: string, row: T, full: string, when: boolean): T | RenderChildren => {
      if (row === null || !when) return row
      const scope = `tip:${id}`.slice(0, 64)
      const node = <Box flexDirection="column" hover={{ scope }}>{row}</Box>
      cards.push({ scope, full, node })
      return node
    }

    // Header: what runs, where, and what it has cost.
    const sign = mainRunning ? SPINNER[tick % SPINNER.length] : '◆'
    const cost = usage.cost === undefined ? '' : `${usage.cost.usd.toFixed(2)} $`
    const lit = now < flashUntil
    const place = cachedBranch.value === null ? folderName(cwd) : `⎇ ${cachedBranch.value}`
    const header = tip('header', (
      <Box flexDirection="row" justifyContent="space-between" width={width}>
        <Text wrap="truncate-end">
          <Text color={HEADER}>{sign} </Text>
          {cachedBranch.value === null ? <Text bold>{folderName(cwd)}</Text> : <Text color={HEADER}>⎇ {cachedBranch.value}</Text>}
        </Text>
        <Text bold={lit} color={lit ? AMBER : SECONDARY}>{cost}</Text>
      </Box>
    ), cachedBranch.value === null ? cwd : `⎇ ${cachedBranch.value}\n${cwd}`, place.length + cost.length + 3 > width)

    // The strip: the running light while the work goes on, solid green once it is done.
    const stripState: StripState = isScanning()
      ? 'scan'
      : ended === null ? 'idle' : ended.reason === 'aborted' || ended.reason === 'error' ? 'stopped' : 'done'
    let strip
    if (e.surface === 'terminal') {
      const { Raster } = $.ui.resolve(e)
      stripWidth = width
      strip = <Raster key={STRIP_KEY} columns={width} rows={1} cells={rasterCells(stripCells(stripState, width, scanFrame * STRIP_FRAME_MS))} />
      if (stripState === 'scan') runStrip($)
    } else {
      // Elsewhere it moves with the pane's own redraws, colour runs as Text.
      const runs: StripCell[] = []
      for (const cell of stripCells(stripState, width, now)) {
        const prev = runs[runs.length - 1]
        if (prev !== undefined && prev.color === cell.color) prev.char += cell.char
        else runs.push({ ...cell })
      }
      strip = (
        <Box key={STRIP_KEY}>
          <Text>{runs.map(r => <Text color={r.color}>{r.char}</Text>)}</Text>
        </Box>
      )
    }

    // The end of the work: lit for a few seconds, then quiet until the next turn.
    let doneRow = null
    if (ended !== null && !mainRunning) {
      const look = DONE_LOOK[ended.reason]
      const isFresh = now - ended.at < BANNER_MS
      const line = `${look.icon} ${look.label} alle ${clockTime(new Date(ended.at).toISOString())} · ${doneSummary(ended)}`
      doneRow = tip('done', (
        <Text wrap="truncate-end" bold={isFresh} color={isFresh ? look.color : SECONDARY}>
          <Text color={look.color}>{look.icon}</Text>
          {line.slice(look.icon.length)}
        </Text>
      ), line, line.length > width)
    }

    // Limits: 5 hours, then the week, then the rest, their resets in one column.
    rememberResets($, usage.rateLimits)
    const reported = new Set(usage.rateLimits.map(l => l.kind))
    const kept = KEPT_LIMITS.filter(kind => !reported.has(kind) && resetFor(kind, undefined, now).at !== undefined)
    const windows: { kind: string; percentUsed?: number; resetsAt?: string }[] = [
      ...usage.rateLimits,
      ...kept.map(kind => ({ kind })),
    ].sort((a, b) => (KEPT_LIMITS.indexOf(a.kind) + 1 || 99) - (KEPT_LIMITS.indexOf(b.kind) + 1 || 99))
    const limits = windows.length === 0
      ? [<Text color={SECONDARY}>{NON_DISPONIBILE} (nessuna lettura ancora)</Text>]
      : windows.map(limit => {
          const reset = resetFor(limit.kind, limit.resetsAt, now)
          const used = limit.percentUsed
          return (
            <Text wrap="truncate-end">
              {`${(LIMIT_NAMES[limit.kind] ?? limit.kind).padEnd(LIMIT_LABEL_WIDTH)} `}
              {used === undefined
                ? <Text color={BAR_EMPTY}>{'─'.repeat(limitCells)}</Text>
                : bar(`limit:${limit.kind}`, used, limitCells)}
              {` ${(used === undefined ? '–' : `${Math.round(used)}%`).padStart(4)}  `}
              <Text color={reset.isRemembered ? BAR_EMPTY : SECONDARY}>{resetText(reset.at, now, reset.isRemembered)}</Text>
            </Text>
          )
        })

    // Context: the window as a bar of its categories once a summary is known.
    const parts = shape === null ? [] : shape.parts.slice(0, TOP_SEGMENTS)
    const partsTotal = shape === null ? 0 : shape.parts.reduce((n, p) => n + p.tokens, 0)
    let contextBar
    if (percent === undefined || used === undefined) {
      contextBar = <Text color={SECONDARY}>Token: {NON_DISPONIBILE} (finestra {tokens(window)})</Text>
    } else {
      let bars = bar('ctx', percent, barCells, threshold(percent), mainRunning)
      if (parts.length > 0 && partsTotal > 0) {
        const filled = clamp(Math.round((tween('ctx', percent) / 100) * barCells), 0, barCells)
        let left = filled
        bars = parts.map((p, i) => {
          const cells = i === parts.length - 1 ? left : Math.min(left, Math.round((p.tokens / partsTotal) * filled))
          left -= cells
          return <Text color={SEGMENTS[i % SEGMENTS.length]}>{'━'.repeat(cells)}</Text>
        })
        bars.push(<Text color={BAR_EMPTY}>{'─'.repeat(barCells - filled)}</Text>)
      }
      contextBar = (
        <Text wrap="truncate-end">
          {'ctx   '}{bars} <Text color={threshold(percent)}>{`${percent}%`}</Text>
          <Text color={SECONDARY}>{` ${tokens(used)}/${tokens(window)}`}</Text>
        </Text>
      )
    }
    const legend = parts.length === 0 ? null : (
      <Text wrap="truncate-end">
        {'      '}
        {parts.map((p, i) => [
          <Text color={SEGMENTS[i % SEGMENTS.length]}>■</Text>,
          <Text color={SECONDARY}>{` ${PART_NAMES[p.name] ?? p.name.toLowerCase()} ${tokens(p.tokens)} `}</Text>,
        ])}
      </Text>
    )

    // Cache: how much of the prompt it served, and how long it stays warm.
    const hit = hitRate(spent.total)
    const cacheBar = hit === undefined ? null : (
      <Text wrap="truncate-end">
        {'cache '}{bar('cache', hit, barCells, hit >= 80 ? HEADER : hit >= 50 ? AMBER : RED)}
        {` ${hit}% hit`}
        <Text color={SECONDARY}>{` · ${tokens(spent.total.cacheRead)} letti`}</Text>
      </Text>
    )
    let cacheClock = null
    if (mainRunning) {
      cacheClock = <Text color={HEADER}>{`      ${ORBIT[Math.floor(now / 240) % ORBIT.length]} cache in uso`}</Text>
    } else if (spent.lastMainAt !== null) {
      const left = spent.lastMainAt + cacheTtlMs - now
      cacheClock = left > 0
        ? <Text color={left < 60_000 ? AMBER : HEADER}>{`      ◷ cache calda ancora ${countdown(left)}`}</Text>
        : (
            <Text color={RED} wrap="truncate-end">
              {`      ⚠ cache scaduta${used === undefined ? '' : `: il prossimo turno riscrive ~${tokens(used)}`}`}
            </Text>
          )
    }
    const last = spent.last === null ? null : (
      <Text wrap="truncate-end" color={SECONDARY}>
        {`turno ↓${tokens(spent.last.input + spent.last.cacheRead + spent.last.cacheWrite)} ↑${tokens(spent.last.output)}`}
        {hitRate(spent.last) === undefined ? '' : ` · cache ${hitRate(spent.last)}%`}
        {spent.last.costUsd === undefined ? '' : <Text bold={lit} color={lit ? AMBER : SECONDARY}>{` · +${spent.last.costUsd.toFixed(2)} $`}</Text>}
      </Text>
    )

    // Where the tokens go, the main loop's alone: what tools gave it, what it wrote,
    // what weighs on every request, files read again, MCP schemas, the turns' trace.
    const ranked = (entries: Record<string, { tokens: number; calls: number }>) =>
      Object.entries(entries)
        .filter(([, t]) => t.tokens > 0)
        .sort((a, b) => b[1].tokens - a[1].tokens)
        .map(([name, t]) => `${name} ${tokens(t.tokens)}×${t.calls}`)
    /** A ranked row: its top entries, every one of them on hover when more were left out or it is cut. */
    const rankedRow = (id: string, label: string, entries: string[]) => {
      if (entries.length === 0) return null
      const shown = entries.slice(0, TOP_TOOLS).join(' · ')
      return tip(id, (
        <Text wrap="truncate-end">
          <Text color={SECONDARY}>{rowLabel(label)}</Text>
          {shown}
        </Text>
      ), entries.join('\n'), entries.length > TOP_TOOLS || ROW_LABEL + shown.length > width)
    }
    const toolRow = rankedRow('output', 'output', ranked(out.byTool))
    const writtenRow = rankedRow('written', 'scritto', ranked(out.written))
    // Each output still in the context is sent again with every request since it arrived.
    const weighed = out.live
      .map(o => ({ ...o, resent: Math.max(0, out.requests - o.at) }))
      .map(o => ({ ...o, weight: o.tokens * o.resent }))
      .filter(o => o.weight > 0)
    const heaviest = weighed.reduce<(typeof weighed)[number] | undefined>((max, o) => (max === undefined || o.weight > max.weight ? o : max), undefined)
    const totalWeight = weighed.reduce((n, o) => n + o.weight, 0)
    let weightRow = null
    if (heaviest !== undefined && heaviest.weight >= 10_000) {
      const shown = `${heaviest.tool}${heaviest.label === '' ? '' : ` ${clip(heaviest.label, 22)}`} ${tokens(heaviest.tokens)} ×${heaviest.resent} ≈${tokens(heaviest.weight)}`
      const all = weighed.length > 1 ? ` · tutti ≈${tokens(totalWeight)}` : ''
      const byWeight = [...weighed].sort((a, b) => b.weight - a.weight).slice(0, 8)
      weightRow = tip('weight', (
        <Text wrap="truncate-end">
          <Text color={heaviest.weight >= 1_000_000 ? AMBER : SECONDARY}>{rowLabel('↯ peso')}</Text>
          {shown}
          <Text color={SECONDARY}>{all}</Text>
        </Text>
      ), byWeight.map(o => `${o.tool}${o.label === '' ? '' : ` ${o.label}`}: ${tokens(o.tokens)} rimandati ${o.resent} volte ≈${tokens(o.weight)}`).join('\n'),
      heaviest.label.length > 22 || weighed.length > 1 || ROW_LABEL + shown.length + all.length > width)
    }
    const rereads = Object.entries(out.reads).filter(([, n]) => n >= REREAD_AT).sort((a, b) => b[1] - a[1])
    const rereadShown = rereads.slice(0, TOP_REREADS).map(([p, n]) => `${baseName(p)} ×${n}`).join(' · ')
    const rereadRow = rereads.length === 0 ? null : tip('rereads', (
      <Text wrap="truncate-end">
        <Text color={AMBER}>{rowLabel('⟳ riletti')}</Text>
        {rereadShown}
      </Text>
    ), rereads.map(([p, n]) => `${p} ×${n}`).join('\n'), rereads.length > TOP_REREADS || ROW_LABEL + rereadShown.length > width)
    const mcp = shape === null ? [] : shape.mcp
    const mcpShown = mcp.slice(0, 2).map(s => `${s.server} ${tokens(s.tokens)}`).join(' · ')
    const mcpRow = mcp.length === 0 ? null : tip('mcp', (
      <Text wrap="truncate-end">
        <Text color={SECONDARY}>{rowLabel('MCP')}</Text>
        {mcpShown}
        <Text color={SECONDARY}>{mcp.length > 2 ? ` · +${mcp.length - 2}` : ''}</Text>
      </Text>
    ), mcp.map(s => `${s.server} ${tokens(s.tokens)}`).join('\n'), mcp.length > 2 || ROW_LABEL + mcpShown.length + 6 > width)
    // The trace: the context at the end of each turn, one cell a turn, a compaction in violet.
    const history = spent.history.slice(-Math.max(1, width - ROW_LABEL - 8))
    let traceRow = null
    if (history.length >= 2) {
      const runs: StripCell[] = []
      for (const turn of history) {
        const ratio = window > 0 ? turn.ctx / window : 0
        const cell = {
          char: SPARK[clamp(Math.floor(ratio * SPARK.length), 0, SPARK.length - 1)] as string,
          color: turn.compacted ? '#B39DDB' : threshold(ratio * 100),
        }
        const prev = runs[runs.length - 1]
        if (prev !== undefined && prev.color === cell.color) prev.char += cell.char
        else runs.push(cell)
      }
      const delta = (history[history.length - 1]?.ctx ?? 0) - (history[history.length - 2]?.ctx ?? 0)
      traceRow = (
        <Text wrap="truncate-end">
          <Text color={SECONDARY}>{rowLabel('turni')}</Text>
          {runs.map(r => <Text color={r.color}>{r.char}</Text>)}
          <Text color={delta >= 20_000 ? AMBER : SECONDARY}>{` ${delta >= 0 ? '+' : '−'}${tokens(Math.abs(delta))}`}</Text>
        </Text>
      )
    }
    const spending = [traceRow, toolRow, writtenRow, weightRow, rereadRow, mcpRow].filter(r => r !== null)

    // Subagents: as many finished ones as the pane has rows left for.
    const fixedRows = 2 + (doneRow ? 1 : 0) + 2 + limits.length + 2 + 2 + (legend ? 1 : 0) + (cacheBar ? 1 : 0) + (cacheClock ? 1 : 0)
      + (last ? 1 : 0) + (spending.length > 0 ? 2 + spending.length : 0) + 2 + active.length
    const finishedShown = clamp(room - fixedRows - 1, 0, FINISHED_MAX)
    const modelWidth = Math.min(
      MODEL_WIDTH_MAX,
      Math.max(1, ...rows.map(a => (a.model === undefined ? 1 : shortModel(a.model).length))),
    )
    const agentTokens = rows.reduce((n, a) => n + (a.tokens ?? 0), 0)
    const agentRows = [...active, ...finished.slice(0, finishedShown)].map(a => {
      const running = ACTIVE.includes(a.status)
      const { icon, color } = AGENT_ICONS[a.status]
      const shownIcon = a.status === 'running' ? ORBIT[(Math.floor(now / 240) + a.id.length) % ORBIT.length] : icon
      const effortText = a.effort === undefined ? '–' : (EFFORT_SHORT[a.effort] ?? String(a.effort))
      const time = a.startedAt === undefined ? '–' : duration((a.endedAt ?? now) - a.startedAt)
      const modelText = a.model === undefined ? '–' : shortModel(a.model)
      const agentSpent = a.tokens === undefined ? '–' : tokens(a.tokens)

      const line = ` ${modelText.slice(0, modelWidth).padEnd(modelWidth)} ${effortText.padEnd(4)} ${time.padStart(5)} ${agentSpent.padStart(4)}  ${a.description}`
      return tip(`agent:${a.id}`, (
        <Text color={running ? undefined : SECONDARY} wrap="truncate-end">
          <Text color={a.status === 'running' && !pulse ? GLOW : color}>{shownIcon}</Text>
          {line}
        </Text>
      ), `${a.description}\n${a.type} · ${modelText} · effort ${effortText} · ${time} · ${agentSpent} token`, 1 + line.length > width)
    })
    const hidden = finished.length - Math.min(finished.length, finishedShown)

    const hiddenRow = hidden > 0
      ? tip('hidden', <Text color={SECONDARY}>+{hidden} terminati</Text>,
          finished.slice(finishedShown).map(a => `${AGENT_ICONS[a.status].icon} ${a.description}`).join('\n'), true)
      : null

    // The pane, row by row: what each row is and how many it takes, so a card knows where its row is.
    const flow: { node: RenderChildren; rows: number }[] = []
    const put = (node: RenderChildren, rows = 1) => {
      if (node !== null && node !== undefined && node !== false) flow.push({ node, rows })
    }
    put(header)
    put(strip)
    put(doneRow)
    put(heading('Limiti'), 2)
    limits.forEach(row => put(row))
    put(heading('Sessione'), 2)
    put(
      <Text wrap="truncate-end">
        {mainModel === null ? NON_DISPONIBILE : shortModel(mainModel)}
        <Text color={SECONDARY}>{` · effort ${mainEffort ?? NON_DISPONIBILE}`}</Text>
      </Text>,
    )
    for (const row of [contextBar, legend, cacheBar, cacheClock, last]) put(row)
    if (spending.length > 0) put(heading('Dove vanno i token'), 2)
    spending.forEach(row => put(row))
    put(heading('Subagent', ` ${active.length} attivi · ${rows.length} totali${agentTokens > 0 ? ` · ${tokens(agentTokens)}` : ''}`), 2)
    if (rows.length === 0) put(<Text color={SECONDARY}>Nessun subagent in questa sessione.</Text>)
    agentRows.forEach(row => put(row))
    put(hiddenRow)

    const rowAt = new Map<RenderChildren, number>()
    let height = 0
    for (const item of flow) {
      rowAt.set(item.node, height)
      height += item.rows
    }
    const cardNodes = cards.map(card => {
      const at = rowAt.get(card.node) ?? 0
      const lines = card.full.split('\n').reduce((n, line) => n + Math.max(1, Math.ceil(line.length / Math.max(1, width - 4))), 0)
      const tall = lines + 2
      const top = at + 1 + tall <= Math.max(room, height) ? at + 1 : Math.max(0, at - tall)
      return (
        <Box
          position="absolute"
          top={top}
          left={0}
          width={width}
          display="none"
          hover={{ scope: card.scope, display: 'flex' }}
          borderStyle="round"
          borderColor={HEADER}
          backgroundColor={TIP_BG}
          paddingX={1}
        >
          <Text wrap="wrap" color={GLOW}>{card.full}</Text>
        </Box>
      )
    })

    schedule($, now)

    return (
      <Box flexDirection="column" width={width}>
        {flow.map(item => item.node)}
        {cardNodes}
      </Box>
    )
  })
}
