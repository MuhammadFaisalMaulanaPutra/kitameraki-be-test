MENJALANKAN PROJECT:

Instal node_modules:
npm install

ubah local.settings.exmaple.json ke local.settings.json

Masukan key db cosmos ke variable "COSMOS_DB_CONNECTION_STRING"

kemudian :
npm run build
func start

Keterangan:

yang saya refactor dari repository ini adalah:

1. Membuat error handling di setiap fungsi yang ada, guna memudahkan dan memberikan keterangan terjadi nya error.
2. Menyesuaikan isi payload dan response
3. custom route
4. Validasi
5. Pagination dan filtering di handle di backend

Untuk sementara, organizationId masih di simpan dalam payload atau parameter, jika kedepannya terdapat project seperti ini, organizationId dapat di simpan dalam proses autentikasi seperti JWT dan lainnya, guna memeberikan keamanaan dari sisi backend.

untuk dokumentasi API sudah saya letakan di :
Task.postman_collection.json
