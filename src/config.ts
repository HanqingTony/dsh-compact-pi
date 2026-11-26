/** Project-local settings for the DSH policy. */
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { resolveConfig, type Policy } from '../vendor/dsh-runtime.mjs'
export interface DcpConfig {
  policy: Policy
  audit: boolean
}
type SummaryModel = { provider: string; id: string }

async function readConfig(cwd: string): Promise<unknown> {
  for (const file of ['dcp.json', 'zcp.json']) {
    try {
      return JSON.parse(await readFile(path.join(cwd, '.pi', file), 'utf8'))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
  return {}
}

function validateConfig(value: unknown): Partial<DcpConfig> {
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
  return record as Partial<DcpConfig>
}

export async function loadConfig(cwd: string): Promise<DcpConfig> {
  const { policy = {}, audit = true } = validateConfig(await readConfig(cwd))
  return { policy, audit }
}

export function summaryModelLabel(policy: Policy): string {
  return policy.summarizationProvider && policy.summarizationModel
    ? `${policy.summarizationProvider}/${policy.summarizationModel}`
    : 'Auto (last model that answered, then current request model)'
}

/** Set the project default while preserving per-model policies and other settings. */
export async function saveSummaryModel(cwd: string, model?: SummaryModel): Promise<void> {
  const config = validateConfig(await readConfig(cwd))
  const policy = { ...config.policy }
  if (model) {
    policy.summarizationProvider = model.provider
    policy.summarizationModel = model.id
  } else {
    if (policy.summarizationProvider === undefined) return
    delete policy.summarizationProvider
    delete policy.summarizationModel
  }
  resolveConfig(policy)
  const dir = path.join(cwd, '.pi')
  await mkdir(dir, { recursive: true })
  const temp = path.join(dir, `.dcp-${randomUUID()}.tmp`)
  try {
    await writeFile(temp, JSON.stringify({ ...config, policy }, null, 2) + '\n', {
      flag: 'wx',
      mode: 0o600,
    })
    await rename(temp, path.join(dir, 'dcp.json'))
  } finally {
    await rm(temp, { force: true })
  }
}
