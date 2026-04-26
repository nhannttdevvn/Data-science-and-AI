import { EventEmitter } from "events";

const receiptEventHub = new EventEmitter();
receiptEventHub.setMaxListeners(100);

export function publishReceiptEvent(payload) {
  receiptEventHub.emit("receipt.extracted", payload);
}

export function onReceiptEvent(listener) {
  receiptEventHub.on("receipt.extracted", listener);
  return () => receiptEventHub.off("receipt.extracted", listener);
}
