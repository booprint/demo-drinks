import { Kafka, type Producer } from 'kafkajs'
import { config } from '../config'

const kafka = new Kafka({ clientId: 'drinks', brokers: config.kafkaBrokers })
let producer: Producer | null = null

/** Connects the shared producer once at boot. Sends before this fail loudly. */
export async function initProducer() {
  producer = kafka.producer({ idempotent: true, maxInFlightRequests: 1 })
  await producer.connect()
}

export function getProducer(): Producer {
  if (!producer) throw new Error('Kafka producer is not connected')
  return producer
}

export async function closeProducer() {
  await producer?.disconnect()
}
