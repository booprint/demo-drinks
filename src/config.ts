/** drinks configuration, read once at boot. */

function need(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is required (see .env.example)`)
  return value
}

export const config = {
  port: Number(process.env.PORT ?? 8081),
  kafkaBrokers: need('KAFKA_BROKERS', process.env.KAFKA_BROKERS).split(',').map((b) => b.trim()),
  /** Base URL of the food service, for combo pricing. */
  foodBaseUrl: need('FOOD_BASE_URL', process.env.FOOD_BASE_URL).replace(/\/$/, ''),
  /** Where to tell guests their tab closed. Optional: unset means no notification. */
  notifyUrl: process.env.NOTIFY_URL?.replace(/\/$/, ''),
  /** Milliseconds to wait for food before falling back to the last known price. */
  foodTimeoutMs: Number(process.env.FOOD_TIMEOUT_MS ?? 200),
}
