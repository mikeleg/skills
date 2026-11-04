import { atom, read, update } from 'claude-code'
import type { AgentInfo, AgentStatus, EngineInterface, Register } from 'claude-code'

import type { CruscottoAgent } from '../types'

const PANE = 'cruscotto'
const NON_DISPONIBILE = 'non disponibile'
const HEADER = '#80CBC4'
const SECONDARY = '#90A4AE'
const BAR_EMPTY = '#455A64'
const BAR_CELLS = 20
const LIMIT_BAR_CELLS = 12
const LIMIT_LABEL_WIDTH = 8
const BRANCH_REFRESH_MS = 30_000

const model = atom({ plugin: 'cruscotto', key: 'model' } as const, null)
const effort = atom({ plugin: 'cruscotto', key: 'effort' } as const, null)
const branch = atom({ plugin: 'cruscotto', key: 'branch' } as const, { value: null, at: 0 })
// Change the tag when CruscottoAgent's fields change: it declines what an
// earlier version stored, which outlives a reload.
const agents = atom({ plugin: 'cruscotto', key: 'agents' } as const, {}, { shape: 'agents-2' })
const activity = atom({ plugin: 'cruscotto', key: 'activity' } as const, { files: [], commands: 0 })

type AgentRow = AgentInfo & Partial<CruscottoAgent>

const LIMIT_NAMES: Record<string, string> = {
  five_hour: '5 ore',
  seven_day: '7 giorni',
  spend_limit: 'Spesa',
}
const WEEKDAYS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
const AGENT_ICONS: Record<AgentStatus, { icon: string; color: string }> = {
  running: { icon: '●', color: HEADER },
  pending: { icon: '◌', color: SECONDARY },
  waiting: { icon: '◌', color: SECONDARY },
  idle: { icon: '○', color: SECONDARY },
  completed: { icon: '✓', color: SECONDARY },
  failed: { icon: '✗', color: '#EF9A9A' },
  killed: { icon: '■', color: '#EF9A9A' },
}
const EFFORT_SHORT: Record<string, string> = { medium: 'med', xhigh: 'xh' }
const ACTIVE: AgentStatus[] = ['running', 'pending', 'waiting']
const MODEL_WIDTH_MAX = 10
const FINISHED_SHOWN = 5
const pad2 = (n: number) => String(n).padStart(2, '0')

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

/** 'claude-sonnet-4-5-20250929' -> 'sonnet': no version; aliases and unknown formats stay as they are. */
function shortModel(id: string): string {
  const stripped = id.replace(/^claude-/, '').replace(/\[[^\]]*\]$/, '').replace(/-\d{8}$/, '')
  const [, family] = /^([a-z]+)-\d+(?:-\d+)*$/.exec(stripped) ?? []
  return family ?? id
}

function tokens(n: number): string {
  return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)
}

function bar(percent: number, cells: number): { filled: string; empty: string; color: string } {
  const filled = Math.min(cells, Math.max(0, Math.round((percent / 100) * cells)))
  return {
    filled: '━'.repeat(filled),
    empty: '─'.repeat(cells - filled),
    color: percent >= 80 ? '#EF9A9A' : percent >= 60 ? '#FFCC80' : HEADER,
  }
}

function resetText(resetsAt: string | undefined, now: number): string {
  if (resetsAt === undefined) return '◷ n/d'
  const minutes = Math.max(0, Math.round((Date.parse(resetsAt) - now) / 60_000))
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `◷ ${hours}h${pad2(minutes % 60)} (${clockTime(resetsAt)})`
  const weekday = WEEKDAYS[new Date(resetsAt).getDay()]
  return `◷ ${Math.floor(hours / 24)}g ${hours % 24}h (${weekday} ${clockTime(resetsAt)})`
}

function folderName(cwd: string): string {
  return cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd
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

/** The always-visible line: model, context, active subagents, files edited and commands run. */
async function refreshStatus($: EngineInterface): Promise<void> {
  try {
    const [mainModel, known, usage, list, { files, commands }] = await Promise.all([
      read($, model),
      read($, agents),
      $.session.usage(),
      $.agent.list(),
      read($, activity),
    ])
    const active = list.filter(a => ACTIVE.includes(a.status))
    const models = [...new Set(active.flatMap(a => known[a.id]?.model ?? []).map(shortModel))]
    const { percent } = usage.context
    const segments = [
      mainModel === null ? '' : shortModel(mainModel),
      percent === undefined ? '' : `ctx ${percent}%`,
      active.length === 0 ? '' : `agenti ${active.length}${models.length === 0 ? '' : ` ${models.join(', ')}`}`,
      [files.length > 0 ? `✎${files.length}` : '', commands > 0 ? `⚡${commands}` : ''].filter(Boolean).join(' '),
    ].filter(Boolean)
    await $.ui.status(segments.length === 0 ? undefined : segments.join(' · '))
  } catch {
    // The status line is a courtesy: it never gets in the way of the session.
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'cruscotto',
      description: 'Apre il cruscotto: limiti, contesto e subagent',
    })
    await refreshBranch($)
    void $.ui.open({ id: PANE, title: 'Cruscotto' })
    // The Contesto tab of an earlier version outlives a reload: close it once.
    void $.ui.close({ id: 'cruscotto-contesto' }).catch(() => {})
    $.clock.every(30_000, () => $.ui.invalidate('ui.render'))
    await refreshStatus($)

    return next(e)
  })

  on('command.run', { command: 'cruscotto' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Cruscotto', focus: true })

    return { text: 'Cruscotto aperto.' }
  })

  on('session.measure', async ($, e, next) => {
    await refreshBranch($)
    $.ui.invalidate('ui.render')
    await refreshStatus($)

    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    const id = started.agentId
    if (id !== undefined) {
      const startedAt = await $.clock.now()
      await update($, agents, all => ({
        ...Object.fromEntries(Object.entries(all).slice(-49)),
        [id]: { ...all[id], startedAt, model: started.model },
      }))
    }
    await refreshStatus($)

    return started
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined) {
      if (e.tool === 'Edit' || e.tool === 'Write') {
        const path = e.file_path
        await update($, activity, all => (all.files.includes(path) ? all : { ...all, files: [...all.files, path] }))
      } else if (e.tool === 'Bash') {
        await update($, activity, all => ({ ...all, commands: all.commands + 1 }))
      }
    }
    await refreshStatus($)

    return ran
  })

  on('turn.step', async function* ($, e, next) {
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
    if (id === undefined) {
      const reported = e.usage?.model
      if (reported !== undefined) await update($, model, () => reported)
    } else {
      const endedAt = await $.clock.now()
      await update($, agents, all => {
        const known = all[id]
        return known ? { ...all, [id]: { ...known, endedAt } } : all
      })
    }
    const done = await next(e)
    await refreshStatus($)

    return done
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const [usage, list, now, mainModel, known, cwd, mainEffort, cachedBranch] = await Promise.all([
      $.session.usage(),
      $.agent.list(),
      $.clock.now(),
      read($, model),
      read($, agents),
      $.session.cwd(),
      read($, effort),
      read($, branch),
    ])
    const rows: AgentRow[] = list.map(a => ({ ...a, ...known[a.id] }))
    const { tokens: used, window, percent } = usage.context
    // Most recent first, the ones still working ahead of the finished.
    const recent = [...rows].reverse().sort((x, y) => (y.startedAt ?? -1) - (x.startedAt ?? -1))
    const active = recent.filter(a => ACTIVE.includes(a.status))
    const finished = recent.filter(a => !ACTIVE.includes(a.status))
    const activeCount = active.length
    const modelWidth = Math.min(
      MODEL_WIDTH_MAX,
      Math.max(1, ...rows.map(a => (a.model === undefined ? 1 : shortModel(a.model).length))),
    )
    const bars = (percent: number, cells: number) => {
      const { filled, empty, color } = bar(percent, cells)
      return [<Text color={color}>{filled}</Text>, <Text color={BAR_EMPTY}>{empty}</Text>]
    }

    return (
      <Box flexDirection="column" width={e.props.bodyColumns}>
        <Text wrap="truncate-end">
          {cachedBranch.value === null ? (
            <Text bold>{folderName(cwd)}</Text>
          ) : (
            <Text color={HEADER}>⎇ {cachedBranch.value}</Text>
          )}
        </Text>

        <Box marginTop={1}>
          <Text bold color={HEADER}>Limiti</Text>
        </Box>
        {usage.rateLimits.length === 0 && <Text color={SECONDARY}>{NON_DISPONIBILE} (nessuna lettura ancora)</Text>}
        {usage.rateLimits.map(limit => (
          <Text wrap="truncate-end">
            {`${(LIMIT_NAMES[limit.kind] ?? limit.kind).padEnd(LIMIT_LABEL_WIDTH)} `}
            {bars(limit.percentUsed, LIMIT_BAR_CELLS)}
            {` ${`${limit.percentUsed}%`.padStart(4)}  `}
            <Text color={SECONDARY}>{resetText(limit.resetsAt, now)}</Text>
          </Text>
        ))}

        <Box marginTop={1}>
          <Text bold color={HEADER}>Contesto</Text>
        </Box>
        <Text>
          Modello: {mainModel === null ? NON_DISPONIBILE : shortModel(mainModel)} · <Text color={SECONDARY}>effort {mainEffort ?? NON_DISPONIBILE}</Text>
        </Text>
        {percent === undefined || used === undefined ? (
          <Text color={SECONDARY}>Token: {NON_DISPONIBILE} (finestra {tokens(window)})</Text>
        ) : (
          <Text>
            {bars(percent, BAR_CELLS)} {percent}% · {tokens(used)} / {tokens(window)} token
          </Text>
        )}
        <Text>Costo sessione: {usage.cost ? `${usage.cost.usd.toFixed(2)} $` : NON_DISPONIBILE}</Text>

        <Box marginTop={1}>
          <Text>
            <Text bold color={HEADER}>Subagent</Text>
            <Text color={SECONDARY}>{` ${activeCount} attivi · ${rows.length} totali`}</Text>
          </Text>
        </Box>
        {rows.length === 0 && <Text color={SECONDARY}>Nessun subagent in questa sessione.</Text>}
        {[...active, ...finished.slice(0, FINISHED_SHOWN)].map(a => {
          const { icon, color } = AGENT_ICONS[a.status]
          const effortText = a.effort === undefined ? '–' : (EFFORT_SHORT[a.effort] ?? String(a.effort))
          const time = a.startedAt === undefined ? '–' : duration((a.endedAt ?? now) - a.startedAt)
          const modelText = a.model === undefined ? '–' : shortModel(a.model)

          return (
            <Text color={ACTIVE.includes(a.status) ? undefined : SECONDARY} wrap="truncate-end">
              <Text color={color}>{icon}</Text>
              {` ${modelText.slice(0, modelWidth).padEnd(modelWidth)} ${effortText.padEnd(4)} ${time.padStart(5)}  ${a.description}`}
            </Text>
          )
        })}
        {finished.length > FINISHED_SHOWN && (
          <Text color={SECONDARY}>+{finished.length - FINISHED_SHOWN} terminati</Text>
        )}
      </Box>
    )
  })
}
