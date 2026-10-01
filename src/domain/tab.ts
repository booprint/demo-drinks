import { randomUUID } from 'node:crypto'

/** A Tab collects everything a table orders at the bar until it is settled. */
export interface TabLine {
  sku: string
  name: string
  quantity: number
  /** Unit price in minor units (cents), fixed when the line is added. */
  price_minor: number
  /** True when a combo was priced from a cached food price because food didn't answer in time. */
  stale_price?: boolean
}

export type TabStatus = 'open' | 'settled'

export class Tab {
  readonly id = `tab_${randomUUID().slice(0, 8)}`
  readonly openedAt = new Date()
  status: TabStatus = 'open'
  settledAt?: Date
  lines: TabLine[] = []

  constructor(
    readonly table: number,
    /** The name the guest gave at the bar, first name only by convention. */
    readonly guestName: string,
  ) {}

  add(line: TabLine) {
    if (this.status !== 'open') throw new Error('This tab is already settled')
    const same = this.lines.find((l) => l.sku === line.sku && l.price_minor === line.price_minor)
    if (same) same.quantity += line.quantity
    else this.lines.push({ ...line })
  }

  get totalMinor(): number {
    return this.lines.reduce((sum, l) => sum + l.price_minor * l.quantity, 0)
  }

  settle() {
    if (this.status !== 'open') throw new Error('This tab is already settled')
    if (this.lines.length === 0) throw new Error('Nothing to settle on an empty tab')
    this.status = 'settled'
    this.settledAt = new Date()
  }
}

const tabs = new Map<string, Tab>()

export function openTab(table: number, guestName: string): Tab {
  const existing = [...tabs.values()].find((t) => t.table === table && t.status === 'open')
  if (existing) return existing
  const tab = new Tab(table, guestName)
  tabs.set(tab.id, tab)
  return tab
}

export function getTab(id: string): Tab | undefined {
  return tabs.get(id)
}

export function openTabs(): Tab[] {
  return [...tabs.values()].filter((t) => t.status === 'open')
}
