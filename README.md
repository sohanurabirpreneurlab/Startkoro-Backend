# StartKoro Backend

Node.js + TypeScript + Express backend for the StartKoro AI assistant. It handles user authentication, chat history, manual knowledge ingestion, OpenAI embeddings, Postgres pgvector similarity search, and RAG-based assistant responses.

## Stack

- Node.js
- TypeScript
- Express.js
- Postgres with pgvector
- OpenAI API
- JWT authentication
- Clean service-layer architecture with interfaces instead of entity classes

## Project Structure

```txt
startkoro-backend/
  src/
    config/
    interfaces/
    routes/
    controllers/
    services/
    repositories/
    middlewares/
    utils/
    database/
    app.ts
    server.ts
```

## Main Flow

1. A user logs in or registers.
2. The frontend calls the backend with a JWT.
3. The user creates a new chat or opens an existing one.
4. The user sends a message.
5. If the message has no `chatId`, the backend creates the chat at that moment.
6. The backend stores the user message.
7. The backend creates an embedding for that message with OpenAI.
8. The backend calls the database function `match_document_chunks`.
9. The backend loads recent chat history.
10. The backend sends knowledge context, recent history, and the user question to OpenAI.
11. Even if no knowledge chunks are found, the backend still asks OpenAI to answer helpfully.
12. The backend stores the assistant answer, returns the `chatId` plus both messages, and emits a realtime socket event.

## API Routes

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Chats

- `POST /api/chats`
- `POST /api/chats/send-message`
- `GET /api/chats`
- `GET /api/chats/:chatId`
- `PATCH /api/chats/:chatId`
- `DELETE /api/chats/:chatId`
- `GET /api/chats/:chatId/messages`

### Knowledge

- `POST /api/knowledge/manual-qa`
- `GET /api/knowledge/documents`
- `DELETE /api/knowledge/documents/:documentId`

### Admin

- `POST /api/admin/knowledge/upload`

## Example Request Bodies

### Register

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "strong-password"
}
```

### Create Manual Q&A Knowledge

```json
{
  "title": "Refund Policy",
  "question": "What is the refund policy?",
  "answer": "Users can request a refund within 7 days."
}
```

### Send Message

```json
{
  "message": "Can I get my money back after buying?"
}
```

### Send Follow-Up Message

```json
{
  "chatId": "existing-chat-uuid",
  "message": "Tell me more"
}
```

### Send Message Response

```json
{
  "success": true,
  "data": {
    "chatId": "chat-uuid",
    "userMessage": {
      "id": "message-uuid",
      "chat_id": "chat-uuid",
      "sender": "user",
      "content": "What is StartKoro?"
    },
    "assistantMessage": {
      "id": "message-uuid",
      "chat_id": "chat-uuid",
      "sender": "assistant",
      "content": "StartKoro is..."
    },
    "retrievedChunks": [
      {
        "id": 1,
        "document_id": 1,
        "chunk_text": "Question: ... Answer: ...",
        "similarity": 0.82
      }
    ]
  }
}
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
PORT=5000
NODE_ENV=development
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xaynndinbqcelwgvnwke.supabase.co:5432/postgres
OPENAI_API_KEY=
OPENAI_CHAT_MODEL=gpt-4.1-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
JWT_SECRET=replace_with_strong_secret
JWT_EXPIRES_IN=7d
```

## Setup

1. Open a terminal in `startkoro-backend`.
2. Install packages:

```bash
npm install
```

3. Copy the example environment file:

```bash
cp .env.example .env
```

4. Add your frontend/backend URLs, `DATABASE_URL`, and `OPENAI_API_KEY` to `.env`.
5. Run the schema with:

```bash
npm run db:migrate
```

6. If you prefer, you can still run [src/database/schema.sql](/mnt/d/StartKoro/startkoro-backend/src/database/schema.sql) manually inside the Supabase SQL Editor.
7. Start the development server:

```bash
npm run dev
```

## Security Notes

- The frontend should never receive the OpenAI API key.
- The frontend should never receive your database connection string.
- This backend talks directly to Postgres using `DATABASE_URL`.
- Protected routes require a valid JWT.

## Admin Excel/CSV Knowledge Upload

Endpoint:

- `POST /api/admin/knowledge/upload`

Auth:

- Requires a valid JWT
- Requires `role = admin`

Request:

- `multipart/form-data`
- field name: `file`

Supported file types:

- `.xlsx`
- `.xls`
- `.csv`

Required columns:

- `question`
- `answer`

Optional columns:

- `title`
- `category`
- `tags`

Example file format:

```txt
title | question | answer | category | tags
Refund Policy | What is the refund policy? | Users can request a refund within 7 days. | Policy | refund,payment
Registration | How can users register? | Users can register using name, email, and password. | Account | signup,account
```

Rules:

- The backend reads the uploaded file from memory with `multer.memoryStorage()`.
- The original spreadsheet is not stored for the MVP.
- The first Excel sheet is used when the file is `.xlsx` or `.xls`.
- Each valid row becomes one `knowledge_document`.
- Each `knowledge_document` becomes one `document_chunk`.
- The chunk text is stored as `Question: ...` plus `Answer: ...` so retrieval returns the answer together with its question context.

Duplicate handling:

- Duplicate detection uses the normalized question.
- Normalization trims whitespace, lowercases text, and collapses repeated spaces.
- Existing duplicates are skipped by default and reported in the upload summary.
- Existing documents are not updated or deleted during upload.

Limits:

- Maximum file size: `5MB`
- Maximum rows per upload: `500`

Response summary:

- `batchId`
- `totalRows`
- `successCount`
- `skippedCount`
- `failedCount`
- `skippedRows`
- `failedRows`

## Notes

- `DATABASE_URL` is the only database connection variable required by this backend.
- Manual Q&A knowledge is stored as a document plus one combined searchable chunk.
- The first message flow creates a chat only when the user actually sends a message.
- Inline comments were added in the important flow points so the code stays understandable for new developers.
