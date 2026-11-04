/** What the mod recorded about one subagent, keyed by its agent id. */
export type CruscottoAgent = {
  /** Absent when a step was seen before the spawn was recorded. */
  startedAt?: number
  endedAt?: number
  model?: string
  effort?: string | number
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
    }
  }
}
