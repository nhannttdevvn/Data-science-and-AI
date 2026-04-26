import { Router } from "express";
import multer from "multer";
import {
  createExpenseFromImage,
  getExpenses,
  reviewExpense,
  deleteExpense,
} from "../controllers/expenseController.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/expenses/upload", upload.single("file"), createExpenseFromImage);
router.get("/expenses", getExpenses);
router.patch("/expenses/:id/review", reviewExpense);
router.delete("/expenses/:id", deleteExpense);

export default router;
