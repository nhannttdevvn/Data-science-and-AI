import axios from "axios";
import type { Receipt, ReviewPayload } from "./types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api",
});

export async function uploadReceipt(file: File): Promise<Receipt> {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post<Receipt>("/expenses/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function fetchReceipts(status?: string): Promise<Receipt[]> {
  const { data } = await api.get<Receipt[]>("/expenses", {
    params: status ? { status } : undefined,
  });
  return data;
}

export async function reviewReceipt(
  id: string,
  payload: ReviewPayload,
): Promise<Receipt> {
  const { data } = await api.patch<Receipt>(`/expenses/${id}/review`, payload);
  return data;
}

export async function deleteReceipt(id: string): Promise<void> {
  await api.delete(`/expenses/${id}`);
}

export function subscribeReceiptEvents(
  onReceiptEvent: (payload: unknown) => void,
  onError?: () => void,
): () => void {
  const base = (
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api"
  ).replace(/\/$/, "");
  const streamUrl = `${base}/events/receipts`;
  const source = new EventSource(streamUrl);

  source.addEventListener("receipt.extracted", (event) => {
    try {
      const parsed = JSON.parse((event as MessageEvent).data);
      onReceiptEvent(parsed);
    } catch {}
  });

  source.onerror = () => {
    onError?.();
  };

  return () => source.close();
}
