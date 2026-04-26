import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { startKafkaReceiptConsumer } from "./services/kafkaConsumer.js";

dotenv.config();

const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

async function bootstrap() {
  await connectDB(mongoUri);
  await startKafkaReceiptConsumer();
  app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
