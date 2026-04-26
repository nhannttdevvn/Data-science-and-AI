import { useState } from "react";
import type { Receipt, KIEField, ReviewPayload } from "../types";

interface Props {
  receipt: Receipt;
  onSave: (id: string, payload: ReviewPayload) => Promise<void>;
  onCancel: () => void;
  onFieldHover: (field: KIEField | null) => void;
}

const FIELDS: { key: KIEField; label: string }[] = [
  { key: "company", label: "Company" },
  { key: "date", label: "Date" },
  { key: "address", label: "Address" },
  { key: "total", label: "Total" },
];

// export default function KIEReviewForm({
//   receipt,
//   onSave,
//   onCancel,
//   onFieldHover,
// }: Props) {
const KIEReviewForm = ({ receipt, onSave, onCancel, onFieldHover }: Props) => {
  const [form, setForm] = useState<ReviewPayload>({
    company: receipt.company,
    date: receipt.date,
    address: receipt.address,
    total: receipt.total,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(receipt._id, form);
    } finally {
      setSaving(false);
    }
  }

  const confidence = Math.round((receipt.overall_confidence ?? 0) * 100);
  const confColor =
    confidence >= 80
      ? "bg-green-100 text-green-700"
      : confidence >= 60
        ? "bg-yellow-100 text-yellow-700"
        : "bg-red-100 text-red-700";

  return (
    <div className="flex flex-col gap-4 p-4 bg-white rounded border border-gray-200 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">KIE Fields</h2>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${confColor}`}
        >
          {confidence}% confidence
        </span>
      </div>

      {receipt.review_required && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm rounded px-3 py-2">
          Low-confidence extraction. Please review the fields below.
        </div>
      )}

      {FIELDS.map(({ key, label }) => (
        <div
          key={key}
          className="flex flex-col gap-1"
          onMouseEnter={() => onFieldHover(key)}
          onMouseLeave={() => onFieldHover(null)}
        >
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {label}
          </label>
          <input
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        </div>
      ))}

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded px-4 py-2 transition-colors"
        >
          {saving ? "Saving…" : "Save Review"}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded px-4 py-2 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default KIEReviewForm;