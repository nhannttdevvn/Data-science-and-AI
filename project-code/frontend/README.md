# Frontend (React + TypeScript)

## Run

```bash
npm install
npm run dev
```

## Main flow

- Upload image receipt
- Backend sends image to AI microservice
- If confidence is low, status is `pending_review`
- Human reviews and edits fields in dashboard
- Frontend subscribes to live receipt events from `GET /api/events/receipts`
