# Mini AI

Mini AI adalah aplikasi chat berbasis Next.js dan TypeScript yang menggunakan
Dify sebagai AI orchestration backend. Browser hanya berkomunikasi dengan Route
Handler internal, sehingga Dify App API key tetap berada di server.

## Fitur

- Percakapan kontekstual menggunakan `conversation_id` Dify selama session aktif.
- Input melalui tombol kirim atau Enter; Shift + Enter membuat baris baru.
- Loading state, error message yang aman, dan action retry.
- Reset chat untuk menghapus pesan, draft, dan context percakapan lokal.
- Copy jawaban AI dengan feedback berhasil atau gagal.
- Transisi start/reset yang menghormati `prefers-reduced-motion`.
- Layout responsif, dark mode mengikuti sistem, dan navigasi keyboard.
- Health endpoint untuk container dan infrastructure monitoring.

Riwayat chat tidak disimpan ke database. Reload halaman atau Reset akan memulai
session baru.

## Arsitektur

```text
Browser
  -> POST /api/chat
  -> Next.js Route Handler
  -> Dify App API /v1/chat-messages
  -> Chatbot, Agent, atau Chatflow
  -> Next.js
  -> Browser
```

`DIFY_API_KEY` tidak pernah dikirim ke browser. Integrasi saat ini ditujukan untuk
aplikasi Dify bertipe Chatbot, Agent, atau Chatflow. Workflow biasa menggunakan
endpoint dan kontrak response berbeda sehingga belum didukung.

## Persyaratan

Untuk local development:

- Node.js 22 atau lebih baru.
- npm.
- Aplikasi Dify yang sudah dikonfigurasi dan dipublikasikan.
- Dify App API key berawalan `app-`.

Untuk deployment VM:

- Git.
- Docker Engine.
- Docker Compose modern yang mendukung `pull_policy: build`.

## Konfigurasi Dify

1. Konfigurasikan model provider pada dashboard Dify.
2. Buat atau buka aplikasi Chatbot, Agent, atau Chatflow.
3. Pastikan node Start tidak memiliki input wajib yang belum dikirim oleh Mini AI.
4. Publish aplikasi.
5. Ambil App API key dari halaman API Access aplikasi tersebut.

Provider API key disimpan di Dify. Mini AI hanya membutuhkan Dify App API key.

## Environment variables

Salin file contoh:

```bash
cp .env.example .env
```

Isi konfigurasi:

```env
DIFY_API_URL=https://dify.example.com/v1
DIFY_API_KEY=app-XXXXXXXXXXXXXXXXXXXXXXXX
APP_ENV=production
NEXT_PUBLIC_APP_NAME=Mini AI
```

`DIFY_API_URL` harus berakhir pada `/v1`, bukan `/chat-messages`. Untuk Dify pada
VM, gunakan IP atau domain yang dapat dijangkau dari server/container Mini AI.
Jangan gunakan `localhost` untuk menunjuk Dify yang berjalan di VM lain.

Jangan menambahkan prefix `NEXT_PUBLIC_` pada API key atau secret lainnya.

## Menjalankan secara lokal

```bash
npm ci
npm run dev
```

Buka `http://localhost:3000`.

Setelah `.env` diubah, hentikan dan jalankan ulang development server agar nilai
environment terbaru digunakan.

Validasi sebelum commit:

```bash
npm run typecheck
npm run lint
npm run build
```

## API internal

### Chat

```text
POST /api/chat
```

Request:

```json
{
  "message": "Jelaskan Docker secara singkat",
  "conversationId": ""
}
```

Response:

```json
{
  "answer": "Docker adalah...",
  "conversationId": "dify-conversation-id"
}
```

Endpoint ini tidak menerima GET. Respons `405 Method Not Allowed` saat membuka
`/api/chat` langsung di browser adalah perilaku yang benar.

Setiap request chat ditulis sebagai structured JSON ke stdout/stderr dan dapat
dilihat melalui `docker logs`. Log hanya memuat timestamp, conversation ID, input
user, jawaban dan conversation ID dari Dify, serta status HTTP. Input yang
mengandung kata `Lindo` (case-insensitive) sengaja menghasilkan HTTP 500 untuk
pengujian alur error.

Log level `info` dan `error` ditulis ke console serta dipisahkan ke file rotasi
harian `logs/application-info-YYYY-MM-DD.log` dan
`logs/application-error-YYYY-MM-DD.log`. File di dalam container tidak persisten
saat container dibuat ulang. Blok volume persisten sudah disiapkan dalam keadaan
dikomentari di `docker-compose.yml` dan dapat diaktifkan saat diperlukan.

### Health check

```text
GET /api/health
```

Response:

```json
{
  "status": "ok"
}
```

## Deployment Docker pada VM

Clone repository dan siapkan environment pada deployment pertama:

```bash
git clone <repository-url> mini-ai
cd mini-ai
cp .env.example .env
nano .env
docker compose config
docker compose up -d
```

Compose membangun production image dari source. Dockerfile menjalankan `npm ci`
dari `package-lock.json`, menjalankan `next build`, lalu memulai standalone server
sebagai non-root user. `.env` hanya dimuat saat container berjalan dan tidak
disalin ke image.

Periksa deployment:

```bash
docker compose ps
docker compose logs -f mini-ai
curl http://localhost:3000/api/health
```

Web app tersedia pada `http://<ip-vm-mini-ai>:3000` selama port tersebut dibuka.
Untuk production publik, gunakan reverse proxy dan HTTPS di depan port 3000.

### Deploy perubahan setelah git pull

```bash
git pull --ff-only
docker compose up -d
docker compose ps
```

Service menggunakan `pull_policy: build`, sehingga `docker compose up -d`
membangun ulang image dari source terbaru. Cache dependency tetap digunakan jika
`package.json` dan `package-lock.json` tidak berubah.

Jika perlu membuang seluruh build cache:

```bash
docker compose build --no-cache
docker compose up -d
```

### Tes Dify dari dalam container

```bash
docker compose exec mini-ai node -e "fetch(process.env.DIFY_API_URL + '/info',{headers:{Authorization:'Bearer '+process.env.DIFY_API_KEY}}).then(r=>console.log('Dify status:',r.status)).catch(console.error)"
```

Hasil yang diharapkan adalah `Dify status: 200`.

## Troubleshooting

### Dify `/info` menghasilkan 401

- Pastikan key berasal dari API Access aplikasi Dify, bukan provider API key.
- Pastikan key berawalan `app-` dan berasal dari aplikasi yang benar.

### Chat menghasilkan 400 dari Dify

- Periksa input wajib pada node Start Chatflow.
- Mini AI saat ini mengirim `inputs: {}` dan pertanyaan melalui `query`.
- Publish ulang aplikasi setelah konfigurasi Dify berubah.

### Web app menghasilkan 502

- Periksa `docker compose logs -f mini-ai` atau terminal `npm run dev`.
- Pastikan Dify dapat dijangkau dari runtime Mini AI, bukan hanya dari host lain.
- Tes `/info` dari dalam container.
- Pastikan aplikasi Dify menggunakan endpoint `/chat-messages`.

### Container tidak healthy

```bash
docker compose ps
docker compose logs --tail=200 mini-ai
curl http://localhost:3000/api/health
```

### Dependency baru tidak terpasang

Pastikan `package-lock.json` ikut di-commit, lalu jalankan:

```bash
docker compose up -d
```

Untuk memastikan seluruh dependency diinstal ulang:

```bash
docker compose build --no-cache mini-ai
docker compose up -d
```

## Scripts

```text
npm run dev        Development server
npm run build      Production build
npm run start      Production server tanpa Docker
npm run typecheck  TypeScript validation
npm run lint       ESLint validation
npm run format     Prettier formatting
```
