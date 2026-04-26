import express from "express";
import cors from "cors";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import expenseRoutes from "./routes/expenseRoutes.js";
import { onReceiptEvent } from "./services/receiptEventHub.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "backend-gateway" });
});

app.get("/api/events/receipts", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (payload) => {
    res.write(`event: receipt.extracted\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const unsubscribe = onReceiptEvent(send);
  const heartbeat = setInterval(() => {
    res.write("event: heartbeat\n");
    res.write(`data: ${Date.now()}\n\n`);
  }, 30000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
});

app.use("/api", expenseRoutes);
app.use("/uploads", express.static(join(__dirname, "../uploads")));

export default app;
