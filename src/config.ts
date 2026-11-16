/** Project-local settings for the DSH policy. */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { resolveConfig, type Policy } from '../vendor/dsh-runtime.mjs'
export interface DcpConfig {
  policy: Policy
  audit: boolean
}
export async function loadConfig(cwd: string): Promise<DcpConfig> {
  let value: unknown
  let found = false
  for (const file of ['dcp.json', 'zcp.json']) {
    try {
      value = JSON.parse(await readFile(path.join(cwd, '.pi', file), 'utf8'))
      found = true
      break
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
  if (!found) return { policy: {}, audit: true }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('dcp.json must be an object')
  const record = value as Record<string, unknown>
  for (const key of Object.keys(record))
    if (!['policy', 'audit'].includes(key))
      throw new Error(`dcp.json: unknown setting ${key}`)
  if (record.audit !== undefined && typeof record.audit !== 'boolean')
    throw new Error('dcp.json: audit must be boolean')
  if (
    record.policy !== undefined &&
    (!record.policy ||
      typeof record.policy !== 'object' ||
      Array.isArray(record.policy))
  )
    throw new Error('dcp.json: policy must be an object')
  const policy = (record.policy ?? {}) as Policy
  resolveConfig(policy)
  return { policy, audit: record.audit !== false }
}
