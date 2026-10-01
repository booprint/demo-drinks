import { randomUUID } from 'node:crypto'
import avro from 'avsc'
import type { Tab } from '../domain/tab'
import { getProducer } from './producer'

/**
 * drinks.order.settled: sent to the `orders` topic when a tab is settled. Delivery is
 * at-least-once, so consumers dedupe on `event_id`.
 */

export const settledType = avro.Type.forSchema({
  type: 'record',
  name: 'DrinksOrderSettled',
  namespace: 'boos_restaurant.drinks',
  fields: [
    { name: 'event_id', type: 'string' },
    { name: 'tab_id', type: 'string' },
    { name: 'table', type: 'int' },
    {
      name: 'items',
      type: {
        type: 'array',
        items: {
          type: 'record',
          name: 'SettledItem',
          fields: [
            { name: 'sku', type: 'string' },
            { name: 'name', type: 'string' },
            { name: 'quantity', type: 'int' },
            { name: 'price_minor', type: 'int' },
          ],
        },
      },
    },
    { name: 'total_minor', type: 'long' },
    { name: 'settled_at', type: 'string' },
  ],
})

export async function emitSettled(tab: Tab) {
  const event = {
    event_id: randomUUID(),
    tab_id: tab.id,
    table: tab.table,
    items: tab.lines.map((l) => ({ sku: l.sku, name: l.name, quantity: l.quantity, price_minor: l.price_minor })),
    total_minor: tab.totalMinor,
    settled_at: (tab.settledAt ?? new Date()).toISOString(),
  }
  await getProducer().send({
    topic: 'orders',
    messages: [
      {
        key: tab.id,
        value: settledType.toBuffer(event),
        headers: { 'event-type': 'drinks.order.settled', encoding: 'avro' },
      },
    ],
  })
  return event
}
