import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'

/** Check the same read endpoints used by the Web UI through its launch URL. */
export async function verifyWebSession(urlFile: string, sessionId: string, events: number) {
  if (!sessionId || !Number.isSafeInteger(events) || events < 1)
    throw new Error('Pass the sessionId and event count from the migration receipt')
  let url: URL
  try {
    url = new URL((await fs.readFile(urlFile, 'utf8')).trim())
  } catch {
    throw new Error('The URL file must contain one DSH Web launch URL')
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.searchParams.has('token'))
    throw new Error('The URL file must contain one DSH Web launch URL')
  const send = async (target: URL, options: RequestInit) => {
    try {
      return await fetch(target, { ...options, redirect: 'manual', signal: AbortSignal.timeout(20000) })
    } catch {
      throw new Error('The confirmed DSH Web instance is unreachable')
    }
  }
  const auth = await send(url, {})
  const cookie = auth.headers.get('set-cookie')?.split(';', 1)[0]
  if (!cookie || auth.status !== 303) throw new Error(`DSH Web authentication failed (HTTP ${auth.status})`)
  const headers = { 'content-type': 'application/json', cookie }
  async function rpc(method: string, args: object) {
    const response = await send(new URL(`./api/${method}`, url), {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: 'client-request', rpcId: randomUUID(), method, payload: { args } }),
    })
    const body = await response.json().catch(() => undefined)
    if (!body?.result?.ok) throw new Error(`DSH Web ${method} failed (HTTP ${response.status}, ${body?.result?.error?.code ?? 'no result'})`)
    return body.result.value
  }
  const list = await rpc('session/list', { _request: {} })
  if (!Array.isArray(list?.items) || !list.items.some((item: { sessionId: string }) => item.sessionId === sessionId))
    throw new Error('The imported ID is missing from the target DSH session list')
  await rpc('session/page', {
    request: { address: { kind: 'session', sessionId }, throughSeq: events - 1, maxMessages: 3 },
  })
  return { sessionId, origin: url.origin, status: 'verified', checks: ['session/list', 'session/page'] }
}
