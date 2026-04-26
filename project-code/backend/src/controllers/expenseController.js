import Expense from "../models/Expense.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { extractReceiptFromAI } from "../services/aiService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "../../uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function mapStatus(reviewRequired) {
  return reviewRequired ? "pending_review" : "auto_approved";
}

function isBlank(value) {
  return value == null || String(value).trim() === "";
}

function collectFieldFromTokens(tokens, labelHints) {
  const normalizedHints = labelHints.map((hint) => hint.toUpperCase());

  const matched = tokens
    .filter((token) => {
      const label = String(token?.label ?? "").toUpperCase();
      return normalizedHints.some((hint) => label.includes(hint));
    })
    .sort((a, b) => {
      const ay = Number(a?.bbox?.[1] ?? 0);
      const by = Number(b?.bbox?.[1] ?? 0);
      if (ay !== by) return ay - by;
      const ax = Number(a?.bbox?.[0] ?? 0);
      const bx = Number(b?.bbox?.[0] ?? 0);
      return ax - bx;
    })
    .map((token) => String(token?.text ?? "").trim())
    .filter(Boolean);

  if (!matched.length) return null;

  const seen = new Set();
  const unique = [];
  for (const text of matched) {
    const key = text.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(text);
    }
  }

  return unique.join(" ").trim() || null;
}

function mergeExtractedFields(aiResult) {
  const tokens = Array.isArray(aiResult?.tokens) ? aiResult.tokens : [];
  const rawFields = aiResult?.fields ?? {};

  const fallback = {
    company: collectFieldFromTokens(tokens, [
      "COMPANY",
      "STORE_NAME",
      "SELLER",
    ]),
    date: collectFieldFromTokens(tokens, ["DATE", "DATE_TIME", "TIMESTAMP"]),
    address: collectFieldFromTokens(tokens, ["ADDRESS"]),
    total: collectFieldFromTokens(tokens, [
      "TOTAL",
      "TOTAL_PRICE",
      "TOTAL_COST",
      "AMOUNT",
    ]),
  };

  return {
    company: isBlank(rawFields.company)
      ? fallback.company
      : String(rawFields.company).trim(),
    date: isBlank(rawFields.date)
      ? fallback.date
      : String(rawFields.date).trim(),
    address: isBlank(rawFields.address)
      ? fallback.address
      : String(rawFields.address).trim(),
    total: isBlank(rawFields.total)
      ? fallback.total
      : String(rawFields.total).trim(),
  };
}

function computeOverallConfidence(aiResult) {
  if (typeof aiResult?.overall_confidence === "number") {
    return aiResult.overall_confidence;
  }

  const tokens = Array.isArray(aiResult?.tokens) ? aiResult.tokens : [];
  if (!tokens.length) return 0;

  const scoreSum = tokens.reduce((sum, token) => {
    const score = Number(token?.score ?? 0);
    return sum + (Number.isFinite(score) ? score : 0);
  }, 0);

  return scoreSum / tokens.length;
}

// ── POST /api/expenses/upload ─────────────────────────────────────────────────
export async function createExpenseFromImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const timestamp = Date.now();
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${timestamp}-${safeName}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), req.file.buffer);

    const backendUrl =
      process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8000}`;
    const imageUrl = `${backendUrl}/uploads/${filename}`;

    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8001";
    const aiResult = await extractReceiptFromAI(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      aiServiceUrl,
    );

    const mergedFields = mergeExtractedFields(aiResult);
    const overallConfidence = computeOverallConfidence(aiResult);
    const reviewRequired =
      typeof aiResult?.review_required === "boolean"
        ? aiResult.review_required
        : overallConfidence < 0.75;

    const expense = await Expense.create({
      company: mergedFields.company,
      date: mergedFields.date,
      address: mergedFields.address,
      total: mergedFields.total,
      tokens: Array.isArray(aiResult?.tokens) ? aiResult.tokens : [],
      overall_confidence: overallConfidence,
      review_required: reviewRequired,
      status: mapStatus(reviewRequired),
      image_name: req.file.originalname,
      image_url: imageUrl,
    });

    return res.status(201).json(expense);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Failed to process receipt", error: error.message });
  }
}

// ── GET /api/expenses ─────────────────────────────────────────────────────────
export async function getExpenses(req, res) {
  try {
    const status = req.query.status;
    const query = status ? { status } : {};
    const expenses = await Expense.find(query).sort({ createdAt: -1 });
    return res.json(expenses);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch expenses", error: error.message });
  }
}

// ── PATCH /api/expenses/:id/review ────────────────────────────────────────────
export async function reviewExpense(req, res) {
  try {
    const { id } = req.params;
    const { company, date, address, total } = req.body;

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    if (company !== undefined) expense.company = company;
    if (date !== undefined) expense.date = date;
    if (address !== undefined) expense.address = address;
    if (total !== undefined) expense.total = total;
    expense.review_required = false;
    expense.status = "reviewed";

    await expense.save();
    return res.json(expense);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to review expense", error: error.message });
  }
}

// ── DELETE /api/expenses/:id ──────────────────────────────────────────────────
export async function deleteExpense(req, res) {
  try {
    const { id } = req.params;
    const expense = await Expense.findByIdAndDelete(id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }
    if (expense.image_url) {
      const fname = expense.image_url.split("/uploads/").pop();
      if (fname) {
        const fp = path.join(UPLOADS_DIR, fname);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
    }
    return res.status(204).send();
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to delete expense", error: error.message });
  }
}
