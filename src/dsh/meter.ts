/** The upstream replay-aware meter, including system and tool-schema pressure. */
import { Context, TokenMeter } from '../../vendor/dsh-runtime.mjs'
const context = new Context()
export const meter = new TokenMeter(context)
export const measure = (session: Parameters<TokenMeter['measure']>[0]) =>
  meter.measure(session)
export const estimateMessage = (
  message: Parameters<TokenMeter['estimateMessage']>[0],
) => meter.estimateMessage(message)
