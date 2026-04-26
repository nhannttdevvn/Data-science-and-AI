import { Kafka } from "kafkajs";
import { publishReceiptEvent } from "./receiptEventHub.js";

const KAFKA_ENABLED = ["1", "true", "yes"].includes(
  String(process.env.KAFKA_ENABLED ?? "true").toLowerCase(),
);
const KAFKA_BROKER = process.env.KAFKA_BROKER ?? "localhost:9092";
const KAFKA_TOPIC =
  process.env.KAFKA_TOPIC_RECEIPT_EXTRACTED ?? "receipt.extracted";
const KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID ?? "backend-receipt-events";

let consumerStarted = false;

export async function startKafkaReceiptConsumer() {
  if (!KAFKA_ENABLED || consumerStarted) {
    return;
  }

  const kafka = new Kafka({ brokers: [KAFKA_BROKER] });
  const consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });

  await consumer.connect();
  await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      try {
        const parsed = JSON.parse(message.value.toString("utf-8"));
        publishReceiptEvent(parsed);
      } catch {}
    },
  });

  consumerStarted = true;
}
