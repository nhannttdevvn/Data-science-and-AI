import { useEffect, useMemo, useState } from "react";
import {
  deleteReceipt,
  fetchReceipts,
  reviewReceipt,
  subscribeReceiptEvents,
  uploadReceipt,
} from "./api";
import type { KIEField, Receipt, ReviewPayload } from "./types";
import KIEReviewForm from "./components/KIEReviewForm";
import ReceiptViewer from "./components/ReceiptViewer";

const App = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selected, setSelected] = useState<Receipt | null>(null);
  const [activeField, setActiveField] = useState<KIEField | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>("");

  const pendingCount = useMemo(
    () => receipts.filter((r) => r.status === "pending_review").length,
    [receipts],
  );

  async function loadReceipts() {
    const data = await fetchReceipts();
    setReceipts(data);
  }

  useEffect(() => {
    loadReceipts().catch(() => setError("Cannot load receipts"));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeReceiptEvents(
      async () => {
        try {
          await loadReceipts();
          setSelected(null);
        } catch { 
          setError("Failed to update receipts");
        }
      },
      () => { },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setSelectedFile(f);
    if (f) setLocalPreview(URL.createObjectURL(f));
  }

  async function onUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setError("");
    try {
      const receipt = await uploadReceipt(selectedFile);
      setSelectedFile(null);
      setLocalPreview(null);
      await loadReceipts();
      setSelected(receipt);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(id: string, payload: ReviewPayload) {
    setError("");
    try {
      const updated = await reviewReceipt(id, payload);
      setReceipts((prev) => prev.map((r) => (r._id === id ? updated : r)));
      setSelected(updated);
    } catch {
      setError("Review update failed");
    }
  }

  async function handleDelete(id: string) {
    setError("");
    try {
      await deleteReceipt(id);
      setReceipts((prev) => prev.filter((r) => r._id !== id));
      if (selected?._id === id) setSelected(null);
    } catch {
      setError("Delete failed");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight">Smart Receipt KIE</h1>
        {pendingCount > 0 && (
          <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">
            {pendingCount} pending
          </span>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6">
        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 text-sm rounded px-4 py-2">
            {error}
          </div>
        )}

        {/* ── Upload card ── */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            {localPreview && (
              <img
                src={localPreview}
                alt="preview"
                className="h-16 w-16 object-cover rounded border"
              />
            )}
            <input
              type="file"
              accept="image/*"
              className="text-sm text-gray-600"
              onChange={onFileChange}
            />
          </div>
          <button
            onClick={onUpload}
            disabled={!selectedFile || uploading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded px-5 py-2 transition-colors whitespace-nowrap"
          >
            {uploading ? "Processing…" : "Upload & Extract"}
          </button>
        </div>

        {/* ── Split-screen viewer ── */}
        {selected && (
          <div className="grid grid-cols-2 gap-4 bg-white rounded-lg border border-gray-200 p-4">
            <ReceiptViewer
              imageUrl={selected.image_url}
              tokens={selected.tokens}
              activeField={activeField}
            />
            <KIEReviewForm
              key={selected._id}
              receipt={selected}
              onSave={handleSave}
              onCancel={() => setSelected(null)}
              onFieldHover={setActiveField}
            />
          </div>
        )}

        {/* ── History table ── */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-4 py-2 text-left">Company</th>
                  <th className="px-4 py-2 text-left">Total</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Confidence</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr
                    key={r._id}
                    onClick={() => setSelected(r)}
                    className={`border-t border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${selected?._id === r._id ? "bg-blue-50" : ""}`}
                  >
                    <td className="px-4 py-2 font-medium">
                      {r.company || "—"}
                    </td>
                    <td className="px-4 py-2">{r.total || "—"}</td>
                    <td className="px-4 py-2">{r.date || "—"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === "pending_review"
                          ? "bg-yellow-100 text-yellow-700"
                          : r.status === "reviewed"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                          }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {Math.round((r.overall_confidence ?? 0) * 100)}%
                    </td>
                    <td
                      className="px-4 py-2 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleDelete(r._id)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {receipts.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-gray-400"
                    >
                      No receipts yet. Upload one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
