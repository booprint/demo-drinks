import { config } from './config'
import type { Tab } from './domain/tab'

/** Tells the guest their tab is closed ("Thanks, Sam! Your tab at table 12 is closed."). */
export async function notifyTabClosed(tab: Tab): Promise<void> {
  if (!config.notifyUrl) return
  const body = {
    kind: 'tab_closed',
    table: tab.table,
    guest_first_name: tab.guestName.split(' ')[0],
    total_minor: tab.totalMinor,
    message: `Thanks, ${tab.guestName.split(' ')[0]}! Your tab at table ${tab.table} is closed.`,
  }
  try {
    const res = await fetch(`${config.notifyUrl}/api/notify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) console.warn(`[notify] customer-experience answered ${res.status}`)
  } catch (e) {
    // Best effort: a missed notification shouldn't stop the tab from settling.
    console.warn('[notify] failed', (e as Error).message)
  }
}
