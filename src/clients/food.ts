import { config } from '../config'

/** The parts of food's MenuItem drinks uses. */
export interface FoodMenuItem {
  id: string
  name: string
  price_minor: number
  available: boolean
}

// Last price food gave us per item, used when food is slow or down.
const lastKnown = new Map<string, FoodMenuItem>()

export class FoodUnavailable extends Error {}

/**
 * Looks up a menu item in food to price a combo. On a timeout or error it falls back to the last
 * price it saw.
 */
export async function getMenuItem(id: string): Promise<FoodMenuItem & { stale: boolean }> {
  try {
    const res = await fetch(`${config.foodBaseUrl}/menu/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(config.foodTimeoutMs) })
    if (res.status === 404) throw new FoodUnavailable(`food has no menu item ${id}`)
    if (!res.ok) throw new Error(`food answered ${res.status}`)
    const item = (await res.json()) as FoodMenuItem
    lastKnown.set(id, item)
    return { ...item, stale: false }
  } catch (e) {
    if (e instanceof FoodUnavailable) throw e
    const cached = lastKnown.get(id)
    if (cached) {
      console.warn(`[food] ${(e as Error).message}; using last known price for ${id}`)
      return { ...cached, stale: true }
    }
    throw new FoodUnavailable(`Couldn't price ${id}: food didn't answer and there is no earlier price`)
  }
}
