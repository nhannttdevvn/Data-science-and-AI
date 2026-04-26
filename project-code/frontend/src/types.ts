export type ExpenseStatus = "auto_approved" | "pending_review" | "reviewed";
export type ReceiptStatus = "auto_approved" | "pending_review" | "reviewed";
export type KIEField = "company" | "date" | "address" | "total";

export interface TokenPrediction {
  text: string;
  bbox: [number, number, number, number]; // [x0,y0,x1,y1] normalised to 0-1000
  label: string;
  score: number;
}

export interface Receipt {
  _id: string;
  company: string;
  date: string;
  address: string;
  total: string;
  tokens: TokenPrediction[];
  overall_confidence: number;
  review_required: boolean;
  status: ReceiptStatus;
  image_name: string;
  image_url: string;
  createdAt: string;
}

export interface ReviewPayload {
  company: string;
  date: string;
  address: string;
  total: string;
}

export interface ReviewResponse {
  success: boolean;
  message?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface ApiError {
  success: boolean;
  message: string;
}

export interface ColorLabel {
  label: string;
  color: string;
}
