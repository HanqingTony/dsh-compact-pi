/** DSH Session construction and header helpers. */

import { Session } from '../../vendor/dsh-runtime.mjs'
import {
  imageOffloadProjection,
  SESSION_FORMAT_VERSION,
  SessionSeq,
} from '../../vendor/dsh-runtime.mjs'

export const DSH_FORMAT_VERSION = SESSION_FORMAT_VERSION

export interface DshHeader {
  type: 'session'
  version: number
  id: string
  createdAt: number
  cwd?: string
  parentSession?: string
  isSeeded: boolean
  delegationDepth: number
  agentPreset?: string
}

export function makeHeader(
  id: string,
  cwd?: string,
  createdAt = Date.now(),
): DshHeader {
  return {
    type: 'session',
    version: DSH_FORMAT_VERSION,
    id,
    createdAt,
    ...(cwd ? { cwd } : {}),
    isSeeded: false,
    delegationDepth: 0,
  }
}

/** Header fields accepted by Session.create (no physical `type`). */
export function headerForSession(header: DshHeader): any {
  return {
    version: header.version as typeof SESSION_FORMAT_VERSION,
    id: header.id,
    createdAt: header.createdAt,
    ...(header.cwd ? { cwd: header.cwd } : {}),
    ...(header.parentSession ? { parentSession: header.parentSession } : {}),
    isSeeded: header.isSeeded === true,
    delegationDepth: header.delegationDepth ?? 0,
    ...(header.agentPreset ? { agentPreset: header.agentPreset } : {}),
  }
}

export function createSession(
  id: string,
  cwd?: string,
  createdAt = Date.now(),
): { session: Session; header: DshHeader } {
  const header = makeHeader(id, cwd, createdAt)
  const session = Session.create(id as any, [], headerForSession(header))
  return { session, header }
}

export function restoreSession(
  header: DshHeader,
  events: readonly any[],
): Session {
  return Session.create(
    header.id as any,
    events,
    headerForSession(header),
    0 as any,
    [imageOffloadProjection],
  )
}

export function seq(value: number): any {
  return SessionSeq(value)
}
