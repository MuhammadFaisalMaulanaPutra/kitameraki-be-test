# Task Management Azure Function App

Boilerplate Azure Functions v4 dengan TypeScript dan Azure Cosmos DB untuk CRUD task management.

## Struktur

```text
src/
  config/          Environment dan Cosmos DB client
  controllers/     HTTP request/response orchestration
  functions/       Azure Functions v4 registrations
  models/          Domain types
  repositories/    Cosmos DB data access
  services/        Business logic dan validation
  shared/          Error dan HTTP helpers
  validators/      Zod input schemas
web/
  src/api/          Frontend API clients
  src/components/   Task table, filters, pagination, dialog
  src/pages/        Task list and form settings pages
  src/types/        Frontend task and form settings types
tests/              Unit tests untuk validation
```

## Setup lokal

1. Pastikan Node.js 18+ dan Azure Functions Core Tools v4 tersedia.
2. Install dependency:

   ```bash
   npm install
   ```

3. Salin `local.settings.json.example` menjadi `local.settings.json`, lalu isi credential Cosmos DB. Untuk development tanpa emulator, gunakan `STORAGE_MODE=memory`; data akan hidup selama proses Functions berjalan.
4. Buat database dan container dengan partition key `/id`.
5. Build dan jalankan:

   ```bash
   npm run build
   npm start
   ```

  `npm start` menjalankan `npm run build` lalu `func start`. Azure Functions Core Tools v4 harus terinstall.

  Karena `AzureWebJobsStorage` menggunakan `UseDevelopmentStorage=true`, jalankan Azurite pada terminal terpisah:

  ```bash
  npm run start:storage
  ```

6. Jalankan frontend pada terminal terpisah:

  ```bash
  npm run start:web
  ```

  Buka `http://localhost:5173`. Vite meneruskan request `/api` ke Azure Functions pada `http://localhost:7071`.

## Endpoint

Semua endpoint memakai `authLevel: function`.

| Method | Route | Keterangan |
| --- | --- | --- |
| GET | `/api/tasks` | List dengan `search`, `status`, `priority`, `page`, `pageSize` |
| GET | `/api/tasks/{id}` | Detail task |
| POST | `/api/tasks` | Buat task |
| PATCH | `/api/tasks/{id}` | Update sebagian field |
| DELETE | `/api/tasks/{id}` | Hapus task |
| GET | `/api/form-settings` | Ambil konfigurasi form task |
| PUT | `/api/form-settings` | Simpan konfigurasi form task |

Contoh body:

```json
{
  "title": "Review pull request",
  "description": "Review API changes",
  "status": "todo",
  "priority": "high",
  "dueDate": "2026-10-01T12:00:00Z"
}
```

Status: `todo`, `in-progress`, `done`. Priority: `low`, `medium`, `high`.

## Keamanan dan produksi

Input divalidasi dengan Zod, ukuran page dibatasi maksimal 100, query Cosmos memakai parameterized query, dan detail error internal tidak dikirim ke client. Untuk produksi, tambahkan authentication/authorization (misalnya Entra ID), gunakan Managed Identity/RBAC Cosmos DB, secret di Key Vault, serta Application Insights.

Form settings mendukung field system dan custom dengan tipe `text`, `date`, `datetime`, dan `email`. Field dapat diubah labelnya, disusun ulang dengan drag-and-drop, ditempatkan pada kolom 1 atau 2, disembunyikan, dan dibuat required. Container Cosmos menggunakan partition key `/id`; dokumen settings menggunakan id `form-settings`.

`local.settings.json` yang dibuat untuk workspace ini memakai `STORAGE_MODE=memory` sehingga API dapat langsung dijalankan dengan `npm start` tanpa Cosmos Emulator. Untuk production atau pengujian terhadap Cosmos DB, ubah menjadi `STORAGE_MODE=cosmos`, isi endpoint/database/container, lalu pilih `COSMOS_DB_AUTH_MODE=key` atau `COSMOS_DB_AUTH_MODE=managed-identity`.

Dengan `managed-identity`, aplikasi memakai `DefaultAzureCredential` dan tidak membutuhkan `COSMOS_DB_KEY`. Berikan identity role `Cosmos DB Built-in Data Contributor` pada account/database/container yang digunakan.

### Uji Cosmos production

Untuk key authentication, isi environment berikut dengan nilai asli melalui terminal atau Azure App Settings, lalu jalankan backend:

```powershell
$env:STORAGE_MODE = "cosmos"
$env:COSMOS_DB_AUTH_MODE = "key"
$env:COSMOS_DB_ENDPOINT = "https://your-account.documents.azure.com:443/"
$env:COSMOS_DB_KEY = "your-key"
$env:COSMOS_DB_DATABASE = "task-management"
$env:COSMOS_DB_CONTAINER = "tasks"
npm start
```

Verifikasi koneksi dengan `GET http://localhost:7071/api/health`; respons yang benar memiliki `"cosmos":"reachable"`.

Untuk Managed Identity lokal, jalankan `az login`, gunakan `COSMOS_DB_AUTH_MODE=managed-identity`, isi endpoint/database/container, dan pastikan identity yang dipakai memiliki role `Cosmos DB Built-in Data Contributor`. Pada Azure Function App, aktifkan system-assigned identity dan berikan role yang sama pada Cosmos DB. Untuk autentikasi user ke API, aktifkan App Service Authentication dengan Microsoft Entra ID; Managed Identity di atas melindungi akses service ke database, bukan login user.

## Submitted by Zidane Ferdiansyah
