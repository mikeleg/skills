/** What the mod recorded about one subagent, keyed by its agent id. */
export type CruscottoAgent = {
  /** Absent when a step was seen before the spawn was recorded. */
  startedAt?: number
  endedAt?: number
  model?: string
  effort?: string | number
  /** Tokens its turns processed: input, output, cache read and cache write together. */
  tokens?: number
}

/** The four counts the API reports for a response, summed. */
export type TokenCounts = {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

/** What the model calls of this session cost, as their turns reported it. */
export type TokenLedger = {
  /** Every loop: the main one and the subagents. */
  total: TokenCounts
  /** The main loop's last completed turn, with what it cost in dollars when known. */
  last: (TokenCounts & { costUsd?: number }) | null
  /** When the main loop's last turn ended: the prompt cache is warm from there. */
  lastMainAt: number | null
}

/** What the tools gave the model to read, estimated at four characters a token. */
export type ToolLedger = {
  byTool: Record<string, { tokens: number; calls: number }>
  /** The single largest output so far. */
  biggest: { tool: string; label: string; tokens: number } | null
  /** How many times each file was read. */
  reads: Record<string, number>
}

/** The context window's composition, as a /context summary estimated it. */
export type ContextShape = {
  at: number
  /** The categories that occupy the window, largest first. */
  parts: { name: string; tokens: number }[]
  /** The MCP tool schemas inside the window, by server, largest first. */
  mcp: { server: string; tokens: number }[]
}

declare module 'claude-code' {
  interface PluginState {
    cruscotto: {
      /** The main loop's model, as the last completed turn reported it. */
      model: string | null
      /** The main loop's effort, as the last model request carried it. */
      effort: string | number | null
      /** The git branch of the session's folder, and when it was read. */
      branch: { value: string | null; at: number }
      agents: Shaped<Record<string, CruscottoAgent>>
      /** What the session did so far: the distinct files edited (Edit, Write) and the Bash commands run. */
      activity: { files: string[]; commands: number }
      ledger: Shaped<TokenLedger>
      tools: Shaped<ToolLedger>
      context: Shaped<ContextShape | null>
    }
  }
}
