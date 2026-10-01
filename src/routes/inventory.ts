import { Router } from 'express'
import { combos, listDrinks, restock } from '../domain/catalog'

export const inventoryRouter = Router()

inventoryRouter.get('/drinks', (_req, res) => {
  res.json({ drinks: listDrinks(), combos })
})

inventoryRouter.post('/drinks/:sku/restock', (req, res) => {
  const quantity = Number(req.body?.quantity)
  if (!Number.isInteger(quantity) || quantity <= 0) {
    res.status(422).json({ error: 'invalid', message: 'Send { quantity } as a positive whole number' })
    return
  }
  restock(req.params.sku, quantity)
  res.status(204).end()
})
