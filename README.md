# Kitameraki Backend Test — Task Management API

REST API untuk manajemen task berbasis **Azure Functions v4** dengan **Azure Cosmos DB** sebagai database.

## Tech Stack

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| Node.js | >= 18 | Runtime |
| TypeScript | ^4.x | Language |
| Azure Functions | v4 | Serverless framework |
| Azure Cosmos DB | — | NoSQL database |
| Zod | ^3.x | Input validation & schema |

## Arsitektur Project

```
src/
├── index.ts                      # App setup
├── config/
│   └── env.ts                    # Validasi environment variables (Zod)
├── models/
│   ├── task.model.ts             # Zod schemas & types untuk Task
│   └── formSetting.model.ts     # Zod schemas & types untuk Form Settings
├── services/
│   ├── cosmosClient.ts           # Singleton Cosmos DB client
│   ├── task.service.ts           # Business logic — Task CRUD
│   └── formSetting.service.ts   # Business logic — Form Settings CRUD
├── middleware/
│   ├── errorHandler.ts           # Centralized error handling
│   └── validateRequest.ts        # Request validation helpers
└── functions/
    ├── GetTask.ts                # GET    — Ambil satu task
    ├── GetTasks.ts               # GET    — Ambil semua task per org
    ├── InsertTask.ts             # POST   — Buat task baru
    ├── UpdateTask.ts             # PATCH  — Update task (partial)
    ├── DeleteTask.ts             # DELETE — Hapus satu task
    ├── BulkDeleteTasks.ts        # DELETE — Hapus banyak task sekaligus
    ├── GetFormSettings.ts        # GET    — Ambil form settings per org
    └── UpdateFormSettings.ts     # PUT    — Update form settings
```

---

## Petunjuk Instalasi

### Prasyarat

Pastikan software berikut sudah terinstal di sistem kamu:

1. **Node.js** (versi 18 atau lebih baru)
   - Download: https://nodejs.org/
   - Verifikasi:
     ```bash
     node --version
     npm --version
     ```

2. **Azure Functions Core Tools** (versi 4.x)
   - Install via npm:
     ```bash
     npm install -g azure-functions-core-tools@4
     ```
   - Verifikasi:
     ```bash
     func --version
     ```

3. **Azure Cosmos DB Emulator** (untuk development lokal)
   - Download: https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-develop-emulator
   - Atau gunakan connection string Cosmos DB yang sudah ada di Azure

### Langkah 1 — Clone Repository

```bash
git clone <repository-url>
cd kitameraki-be-test
```

### Langkah 2 — Install Dependencies

```bash
npm install
```

### Langkah 3 — Konfigurasi Environment

Buat file `local.settings.json` di root project (file ini tidak di-commit ke git):

```json
{
  "IsEncrypted": false,
  "Values": {
    "NODE_TLS_REJECT_UNAUTHORIZED": "0",
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_DB_CONNECTION_STRING": "<connection-string-cosmos-db-kamu>",
    "COSMOS_DATABASE_NAME": "TaskApp",
    "COSMOS_TASKS_CONTAINER": "Tasks",
    "COSMOS_FORM_SETTINGS_CONTAINER": "FormSettings"
  }
}
```

**Penjelasan variabel:**

| Variable | Deskripsi |
|----------|-----------|
| `NODE_TLS_REJECT_UNAUTHORIZED` | Set `"0"` hanya untuk development lokal (Cosmos Emulator menggunakan self-signed cert) |
| `COSMOS_DB_CONNECTION_STRING` | Connection string ke Cosmos DB. Untuk emulator lokal: `AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==` |
| `COSMOS_DATABASE_NAME` | Nama database di Cosmos DB |
| `COSMOS_TASKS_CONTAINER` | Nama container/collection untuk menyimpan task |
| `COSMOS_FORM_SETTINGS_CONTAINER` | Nama container untuk menyimpan form settings (default: `FormSettings`) |

### Langkah 4 — Siapkan Database

Jika menggunakan **Cosmos DB Emulator**:

1. Buka Cosmos DB Emulator (pastikan sudah running di `https://localhost:8081`)
2. Buka Data Explorer di `https://localhost:8081/_explorer/index.html`
3. Buat database baru dengan nama **`TaskApp`**
4. Di dalam database, buat container-container berikut:
   - Container name: **`Tasks`** — Partition key: **`/organizationId`**
   - Container name: **`FormSettings`** — Partition key: **`/organizationId`**

### Langkah 5 — Build & Jalankan

```bash
# Build TypeScript ke JavaScript
npm run build

# Jalankan Azure Functions secara lokal
npm start
```

Atau jika ingin menjalankan build otomatis (sudah termasuk clean + build):
```bash
npm start
```

> `npm start` otomatis menjalankan `prestart` script yang melakukan `clean` dan `build` sebelum `func start`.

### Langkah 6 — Verifikasi

Setelah berhasil jalan, kamu akan melihat output seperti ini:

```
Functions:

  BulkDeleteTasks:    [DELETE] http://localhost:7071/api/BulkDeleteTasks
  DeleteTask:         [DELETE] http://localhost:7071/api/DeleteTask
  GetFormSettings:    [GET]    http://localhost:7071/api/GetFormSettings
  GetTask:            [GET]    http://localhost:7071/api/GetTask
  GetTasks:           [GET]    http://localhost:7071/api/GetTasks
  InsertTask:         [POST]   http://localhost:7071/api/InsertTask
  UpdateFormSettings: [PUT]    http://localhost:7071/api/UpdateFormSettings
  UpdateTask:         [PATCH]  http://localhost:7071/api/UpdateTask
```

Backend siap digunakan di `http://localhost:7071` 🎉

---

## API Reference

Base URL: `http://localhost:7071/api`

### Task Schema

```json
{
  "id": "uuid (auto-generated)",
  "organizationId": "uuid (required)",
  "title": "string, max 100 chars (required)",
  "description": "string, max 1000 chars (optional)",
  "dueDate": "ISO 8601 datetime (optional)",
  "priority": "low | medium | high (optional)",
  "status": "todo | in-progress | completed (required)",
  "tags": ["string, max 50 chars each"] 
}
```

---

### `POST /api/InsertTask` — Buat Task Baru

**Request Body:**
```json
{
  "organizationId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Buat laporan Q3",
  "description": "Laporan keuangan kuartal 3",
  "dueDate": "2026-08-01T00:00:00.000Z",
  "priority": "high",
  "status": "todo",
  "tags": ["finance", "report"]
}
```

**Response (201 Created):**
```json
{
  "id": "generated-uuid",
  "organizationId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Buat laporan Q3",
  "...": "..."
}
```

---

### `GET /api/GetTasks` — Ambil Semua Task per Organization

**Query Parameters:**

| Parameter | Required | Deskripsi |
|-----------|----------|-----------|
| `organizationId` | ✅ | UUID organization |

**Contoh:**
```
GET /api/GetTasks?organizationId=550e8400-e29b-41d4-a716-446655440000
```

**Response (200):**
```json
[
  { "id": "...", "title": "Task 1", "status": "todo", "..." : "..." },
  { "id": "...", "title": "Task 2", "status": "completed", "..." : "..." }
]
```

---

### `GET /api/GetTask` — Ambil Satu Task

**Query Parameters:**

| Parameter | Required | Deskripsi |
|-----------|----------|-----------|
| `id` | ✅ | UUID task |
| `organizationId` | ✅ | UUID organization |

**Contoh:**
```
GET /api/GetTask?id=<task-uuid>&organizationId=<org-uuid>
```

**Response (200):** Objek task tunggal.

---

### `PATCH /api/UpdateTask` — Update Task (Partial)

**Query Parameters:**

| Parameter | Required | Deskripsi |
|-----------|----------|-----------|
| `id` | ✅ | UUID task yang akan di-update |
| `organizationId` | ✅ | UUID organization |

**Request Body** (kirim field yang ingin diubah saja):
```json
{
  "status": "in-progress",
  "priority": "medium"
}
```

> ⚠️ Minimal satu field harus dikirim. Field `id` dan `organizationId` tidak boleh diubah.

**Response (200):** Objek task yang sudah di-update.

---

### `DELETE /api/DeleteTask` — Hapus Satu Task

**Query Parameters:**

| Parameter | Required | Deskripsi |
|-----------|----------|-----------|
| `id` | ✅ | UUID task |
| `organizationId` | ✅ | UUID organization |

**Response (200):**
```json
{ "message": "Task deleted successfully" }
```

---

### `DELETE /api/BulkDeleteTasks` — Hapus Banyak Task

**Query Parameters:**

| Parameter | Required | Deskripsi |
|-----------|----------|-----------|
| `organizationId` | ✅ | UUID organization |

**Request Body:**
```json
["uuid-task-1", "uuid-task-2", "uuid-task-3"]
```

> Minimum 1 ID, maksimum 100 ID per request.

**Response (200):**
```json
{ "message": "3 task(s) deleted successfully" }
```

---

### `GET /api/GetFormSettings` — Ambil Form Settings

**Query Parameters:**

| Parameter | Required | Deskripsi |
|-----------|----------|-----------|
| `organizationId` | ✅ | UUID organization |

**Contoh:**
```
GET /api/GetFormSettings?organizationId=550e8400-e29b-41d4-a716-446655440000
```

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "organizationId": "550e8400-e29b-41d4-a716-446655440000",
  "fields": [
    {
      "id": "field-uuid-1",
      "label": "Nama Klien",
      "type": "text",
      "required": true,
      "row": 0,
      "column": 0
    },
    {
      "id": "field-uuid-2",
      "label": "Tanggal Deadline",
      "type": "date",
      "required": false,
      "row": 0,
      "column": 1
    }
  ],
  "updatedAt": "2026-07-20T06:00:00.000Z"
}
```

> Jika belum pernah dikonfigurasi, akan mengembalikan `fields: []` dengan `updatedAt: null`.

---

### `PUT /api/UpdateFormSettings` — Update Form Settings

**Query Parameters:**

| Parameter | Required | Deskripsi |
|-----------|----------|-----------|
| `organizationId` | ✅ | UUID organization |

**Request Body:**
```json
{
  "fields": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "label": "Nama Klien",
      "type": "text",
      "required": true,
      "row": 0,
      "column": 0
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "label": "Email PIC",
      "type": "email",
      "required": false,
      "row": 0,
      "column": 1
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "label": "Tanggal Meeting",
      "type": "datetime",
      "required": false,
      "row": 1,
      "column": 0
    }
  ]
}
```

**Field Type Options:**

| Type | Deskripsi |
|------|-----------|
| `text` | Text input |
| `date` | Date picker |
| `datetime` | Date and time picker |
| `email` | Email input dengan validasi format |

**Validasi:**
- Setiap `(row, column)` harus unik
- Kolom hanya boleh `0` atau `1` (maksimal 2 kolom per baris)
- Baris bisa unlimited (mulai dari `0`)
- Maksimal 200 fields per konfigurasi
- Setiap field harus punya `id` unik (UUID)

**Response (200):** Objek form settings yang sudah di-update.

---

## Error Responses

Semua error dikembalikan dalam format yang konsisten.

### Validation Error (400)

Terjadi ketika input tidak valid (body atau query parameters).

```json
{
  "error": "Validation Error",
  "details": [
    { "field": "title", "message": "Title is required" },
    { "field": "status", "message": "Required" }
  ]
}
```

### Not Found (404)

```json
{ "error": "Resource not found" }
```

### Internal Server Error (500)

```json
{ "error": "Internal Server Error" }
```

> Detail error internal tidak pernah diekspos ke client untuk alasan keamanan.

---

## Script NPM

| Script | Perintah | Fungsi |
|--------|----------|--------|
| `npm run build` | `tsc` | Compile TypeScript ke JavaScript |
| `npm run watch` | `tsc -w` | Compile otomatis saat file berubah |
| `npm run clean` | `rimraf dist` | Hapus folder `dist/` |
| `npm start` | `clean → build → func start` | Build ulang dan jalankan |
| `npm test` | — | *(belum tersedia)* |
