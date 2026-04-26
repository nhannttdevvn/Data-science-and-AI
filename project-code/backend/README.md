# Backend API Gateway (Express + MVC)

## Features

- Acts as API Gateway between frontend and AI service
- Stores expense data in MongoDB
- Human-in-the-loop review endpoint for low confidence
- Consumes Kafka `receipt.extracted` events and streams them to frontend via SSE

## Run

```bash
npm install
npm run dev
```

## Endpoints

- `GET /health`
- `POST /api/expenses/upload` (form-data: `file`)
- `GET /api/expenses?status=pending_review`
- `PATCH /api/expenses/:id/review`
- `GET /api/events/receipts` (SSE stream)
