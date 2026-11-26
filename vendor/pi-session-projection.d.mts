import type { AgentMessage } from '@earendil-works/pi-agent-core'
import type { SessionEntry } from '@earendil-works/pi-coding-agent'
export function buildSessionPath(entries: readonly SessionEntry[]): SessionEntry[]
export function buildSessionProjection(entries: readonly SessionEntry[]): {
  messages: AgentMessage[]
}
