import { Router } from 'express'
import { FoodUnavailable, getMenuItem } from '../clients/food'
import { findCombo, findDrink, OutOfStock, restock, take } from '../domain/catalog'
import { getTab, openTab, openTabs, type Tab } from '../domain/tab'
import { emitSettled } from '../events/settled'
import { notifyTabClosed } from '../notify'

export const tabsRouter = Router()

const view = (t: Tab) => ({
  id: t.id,
  table: t.table,
  status: t.status,
  lines: t.lines,
  total_minor: t.totalMinor,
  opened_at: t.openedAt.toISOString(),
  settled_at: t.settledAt?.toISOString() ?? null,
})

tabsRouter.get('/tabs', (_req, res) => {
  res.json({ tabs: openTabs().map(view) })
})

/** Opens a tab for a table, or returns the one already open there. */
tabsRouter.post('/tabs', (req, res) => {
  const { table, guest_name } = req.body ?? {}
  if (!Number.isInteger(table) || typeof guest_name !== 'string' || !guest_name.trim()) {
    res.status(422).json({ error: 'invalid', message: 'Send { table, guest_name }' })
    return
  }
  res.status(201).json(view(openTab(table, guest_name.trim())))
})

tabsRouter.get('/tabs/:id', (req, res) => {
  const tab = getTab(req.params.id)
  if (!tab) {
    res.status(404).json({ error: 'not_found' })
    return
  }
  res.json(view(tab))
})

/** Adds a drink or a combo. Combos are priced live from food. */
tabsRouter.post('/tabs/:id/items', async (req, res) => {
  const tab = getTab(req.params.id)
  if (!tab || tab.status !== 'open') {
    res.status(404).json({ error: 'not_found', message: 'No open tab with that id' })
    return
  }
  const sku = String(req.body?.sku ?? '')
  const quantity = Math.max(1, Number(req.body?.quantity ?? 1))

  try {
    const combo = findCombo(sku)
    if (combo) {
      const drink = findDrink(combo.drink_sku)!
      const food = await getMenuItem(combo.food_item_id)
      take(drink.sku, quantity)
      tab.add({
        sku: combo.sku,
        name: combo.name,
        quantity,
        price_minor: drink.price_minor + food.price_minor - combo.discount_minor,
        stale_price: food.stale || undefined,
      })
    } else {
      const drink = findDrink(sku)
      if (!drink) {
        res.status(422).json({ error: 'unknown_sku', message: `Nothing called ${sku} on the bar menu` })
        return
      }
      take(drink.sku, quantity)
      tab.add({ sku: drink.sku, name: drink.name, quantity, price_minor: drink.price_minor })
    }
  } catch (e) {
    if (e instanceof OutOfStock) {
      res.status(409).json({ error: 'out_of_stock', message: e.message })
      return
    }
    if (e instanceof FoodUnavailable) {
      res.status(503).json({ error: 'food_unavailable', message: e.message })
      return
    }
    throw e
  }
  res.json(view(tab))
})

tabsRouter.delete('/tabs/:id/items/:sku', (req, res) => {
  const tab = getTab(req.params.id)
  const line = tab?.lines.find((l) => l.sku === req.params.sku)
  if (!tab || tab.status !== 'open' || !line) {
    res.status(404).json({ error: 'not_found' })
    return
  }
  tab.lines = tab.lines.filter((l) => l !== line)
  restock(findCombo(line.sku)?.drink_sku ?? line.sku, line.quantity)
  res.json(view(tab))
})

/**
 * Settles a tab: emits drinks.order.settled for bill, then lets the guest know. If the event
 * can't be sent the tab is reopened so nothing is lost.
 */
tabsRouter.post('/tabs/:id/close', async (req, res) => {
  const tab = getTab(req.params.id)
  if (!tab || tab.status !== 'open') {
    res.status(404).json({ error: 'not_found', message: 'No open tab with that id' })
    return
  }
  try {
    tab.settle()
  } catch (e) {
    res.status(409).json({ error: 'cannot_settle', message: (e as Error).message })
    return
  }
  try {
    const event = await emitSettled(tab)
    void notifyTabClosed(tab)
    res.json({ ...view(tab), event_id: event.event_id })
  } catch (e) {
    tab.status = 'open'
    tab.settledAt = undefined
    console.error('[settle] could not emit', e)
    res.status(503).json({ error: 'events_unavailable', message: 'Billing didn’t get this tab. It is still open; try again.' })
  }
})
