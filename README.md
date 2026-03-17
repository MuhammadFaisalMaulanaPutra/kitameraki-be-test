# KitaMeraki Task Management API

Sistem backend serverless untuk aplikasi manajemen tugas, dibangun dengan Azure Functions (Node.js & TypeScript) dan menggunakan Azure Cosmos DB sebagai basis data.

## Prasyarat

Sebelum menjalankan proyek ini, pastikan Anda telah menginstal:
- [Node.js](https://nodejs.org/) (Disarankan versi 20.x ke atas)
- [Azure Functions Core Tools](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local) (Untuk menjalankan functions secara lokal)
- Azure Cosmos DB Emulator (untuk pengembangan lokal) atau akun Azure Cosmos DB yang sudah aktif.

## Instalasi

1. Buka terminal dan masuk ke direktori proyek backend:
   ```bash
   cd kitameraki-be
   ```
   *(Atau sesuaikan dengan path Anda, misal: `cd f:\kitameraki\kitameraki-be`)*

2. Instal dependensi yang diperlukan:
   ```bash
   npm install
   ```

## Variabel Lingkungan (Environment Variables)

Buat file `local.settings.json` di root direktori proyek jika belum ada. File ini mengatur env vars yang dibutuhkan oleh Azure Functions saat berjalan secara lokal:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_DB_CONNECTION": "AccountEndpoint=https://localhost:8081/;AccountKey=..."
  }
}
```

**Penjelasan:**
- `AzureWebJobsStorage`: Koneksi ke storage akun, isi `UseDevelopmentStorage=true` jika menggunakan emulator lokal.
- `FUNCTIONS_WORKER_RUNTIME`: Bahasa runtime (isi `node`).
- `COSMOS_DB_CONNECTION`: Connection string ke server Azure Cosmos DB (bisa menggunakan string emulator lokal atau production).

## Menjalankan Aplikasi Lokal

Ada beberapa skrip yang bisa digunakan sesuai kebutuhan (sesuai konfigurasi di `package.json`).

Sebelum menjalankan server fungsi, jika Anda menggunakan emulator storage lokal (`UseDevelopmentStorage=true`), pastikan menjalankan Azurite:
```bash
npx azurite
```
*(Jalankan perintah ini di tab terminal terpisah)*

1. **Menjalankan Server Lengkap (Build & Start)**
   Mengompilasi file TypeScript ke JavaScript dan mengeksekusi Azure Functions:
   ```bash
   npm start
   ```

2. **Mode Watch (Dev Mode)**
   Jika Anda ingin mengembangkan dan melihat perubahan otomatis di TypeScript compiler:
   ```bash
   npm run watch
   ```
   *Lalu jalankan `func start` di terminal terpisah/lainnya.*

## Roadmap Pengembangan

Berikut adalah rencana dan status fitur pada sistem backend manajemen tugas:

- [x] Konfigurasi Proyek (Azure Functions + TypeScript)
- [x] Integrasi Basis Data (Azure Cosmos DB)
- [x] Implementasi skema validasi data menggunakan `Zod`
- [x] **GET** Keseluruhan Daftar Tugas (Mendukung _Pagination_, Filter _Status_, dan _Pencarian_)
- [x] **GET** Detail Tugas Berdasarkan ID (Membaca berdasarkan ID)
- [x] **POST** Membuat Tugas Baru
- [x] **PUT** Memperbarui Data Tugas
- [x] **DELETE** Menghapus Data Tugas (Satu per satu)
- [x] **DELETE** Bulk Delete (Menghapus banyak tugas sekaligus)
- [ ] Implementasi Autentikasi dan Otorisasi (Contoh: JWT/OAuth2)
- [ ] Penambahan fitur logging komprehensif (misal: Application Insights)
- [ ] Pembuatan Unit Test & Integration Test (Jest/Mocha)
- [ ] CI/CD Deployment ke Azure via GitHub Actions / Azure DevOps
