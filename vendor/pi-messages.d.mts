import type { AgentMessage } from '@earendil-works/pi-agent-core'
import type { Message } from '@earendil-works/pi-ai'
export function convertToLlm(messages: AgentMessage[]): Message[]
