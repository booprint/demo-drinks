import express, { type ErrorRequestHandler } from 'express'
import { config } from './config'
import { closeProducer, initProducer } from './events/producer'
import { inventoryRouter } from './routes/inventory'
import { tabsRouter } from './routes/tabs'

const app = express()
app.use(express.json())

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, service: 'drinks' })
})

app.use(tabsRouter)
app.use(inventoryRouter)

const onError: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'internal', message: 'Something went wrong in drinks' })
}
app.use(onError)

async function main() {
  await initProducer()
  const server = app.listen(config.port, () => console.log(`drinks listening on :${config.port}`))
  const shutdown = async () => {
    server.close()
    await closeProducer()
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((e) => {
  console.error('drinks failed to start', e)
  process.exit(1)
})
