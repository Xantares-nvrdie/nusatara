# NusaTara

Satu aplikasi Next.js (monolith) mengikuti struktur INKLUSA: halaman frontend dan API Elysia di `/api` berjalan di satu server dan satu origin (port 3000), dengan satu `package.json` dan satu `.env` di root.

| Lapisan | Teknologi |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn + Base UI, GSAP, Lucide React |
| Backend & API | Elysia.js (di-*mount* pada `/api`), OpenAPI di `/api/labs` |
| Autentikasi | Better Auth (email/password, Google OAuth opsional, plugin admin) |
| Basis Data | PostgreSQL, Drizzle ORM, Drizzle Kit |
| Tooling | Bun, TypeScript 5, Biome |

## Menjalankan

Butuh Node.js 22+ (dipakai `@google/genai` dan ekstraksi PDF `unpdf`).

```bash
bun install
cp .env.example .env   # isi DATABASE_URL, DIRECT_URL, BETTER_AUTH_SECRET, GEMINI_API_KEY
bun run db:push        # buat tabel auth + NusaTara di database
bun run db:seed        # opsional: akun guru demo, modul, ujian, nilai
bun run dev            # http://localhost:3000 (API di /api, dokumentasi di /api/labs)
```

### Data demo (`bun run db:seed`)

Semua akun memakai password `password123`. Seeder aman dijalankan ulang: data milik akun demo direset, data akun lain tidak disentuh.

| Akun | Modul | PIN ujian |
| --- | --- | --- |
| `guru@nusatara.id` (Sari Wulandari) | Fotosintesis, Siklus Air | `1234`, `2345` |
| `guru2@nusatara.id` (Yohanes Kambu) | Pecahan Sederhana, Keragaman Budaya Indonesia | `3456`, `4567` |

Jika PIN di atas sudah dipakai ujian aktif guru lain, seeder memakai PIN acak dan menampilkannya di akhir.

## API (Elysia, dokumentasi interaktif di `/api/labs`)

| Method | Endpoint | Akses | Fungsi |
| --- | --- | --- | --- |
| `POST` | `/api/modules/convert` | Guru | Konversi materi (teks / PDF / TXT) via Gemini: naskah audio, ringkasan visual, draf soal. Tidak disimpan. |
| `POST` | `/api/modules` | Guru | Simpan modul hasil konversi |
| `GET` | `/api/modules` | Publik | Daftar modul (ringan, tanpa isi), `?q=&page=&pageSize=` |
| `GET` | `/api/modules/mine` | Guru | Daftar modul milik guru |
| `GET` | `/api/modules/:id` | Publik | Isi lengkap modul untuk portal siswa |
| `POST` | `/api/exams` | Guru | Buat sesi ujian + PIN 4 digit unik (di antara ujian aktif) |
| `GET` | `/api/exams` | Guru | Daftar ujian guru + jumlah pengumpulan & rata-rata nilai |
| `PATCH` | `/api/exams/:id` | Guru | `{ isActive }` tutup/buka ujian. Ujian tertutup menolak jawaban dan PIN-nya bisa dipakai ulang |
| `GET` | `/api/exams/:pin` | Publik | Soal untuk ujian suara, tanpa kunci jawaban |
| `POST` | `/api/exams/:pin/submit` | Publik | Kirim jawaban + `attemptId` (UUID), nilai dihitung di server. Aman dikirim ulang: 201 pertama kali, 200 untuk `attemptId` yang sama. Ujian ditutup: 409 `EXAM_CLOSED`. PIN tidak dikenal: 404 `PIN_NOT_FOUND` |
| `GET` | `/api/submissions` | Guru | Nilai siswa untuk ujian milik guru, `?examId=` |

Semua error berbentuk `{ message }` (422 validasi juga menyertakan `errors[]`).

## Struktur

```
public/                             # Ikon dan gambar portal
src/
├── app/
│   ├── api/[[...slugs]]/route.ts   # Elysia app, semua endpoint di /api
│   ├── guru/                       # Portal guru: modul, ujian, nilai, profil
│   ├── tunanetra/                  # Portal siswa tunanetra (audio & ujian suara)
│   ├── tunarungu/                  # Portal siswa tunarungu (kartu visual, peta konsep)
│   ├── masuk/, daftar/             # Login & registrasi
│   ├── layout.tsx
│   └── page.tsx                    # Landing page
├── components/                     # Komponen UI per portal (guru, student, module, site, ui)
├── auth.ts                         # Konfigurasi Better Auth
├── backend/
│   ├── modules/<fitur>/            # index.ts (routes), model.ts (validasi), service.ts (query db)
│   │                               # learning-modules, exams, submissions, profile
│   └── utils/
│       ├── better-auth/            # handler /api/auth/* dan macro { auth } / { adminOnly }
│       ├── gemini.ts               # Klien Gemini (Interactions API + structured output tervalidasi)
│       ├── error.ts                # Pemetaan error global ke { message }
│       └── model.ts                # Skema TypeBox bersama (soal, ringkasan visual, paginasi)
├── db/
│   ├── index.ts                    # Koneksi Drizzle + pg Pool
│   └── schema/                     # Tabel Drizzle (daftarkan di schema/index.ts)
└── lib/                            # api() fetch helper ke /api, store, speech, auth-client, cn()
```

## Menambah modul baru

1. Buat tabel di `src/db/schema/<fitur>.ts`, ekspor dari `src/db/schema/index.ts`, lalu `bun run db:push`.
2. Buat `src/backend/modules/<fitur>/{index,model,service}.ts` (contoh: modul `profile`).
3. Daftarkan dengan `.use(<fitur>Module)` di `src/app/api/[[...slugs]]/route.ts`.

## Scripts

| Script | Fungsi |
| --- | --- |
| `bun run dev` | Dev server |
| `bun run build` / `start` | Build & jalankan produksi |
| `bun run lint` / `format` | Biome |
| `bun run db:generate` / `db:push` / `db:studio` | Drizzle Kit |
| `bun run db:seed` | Isi data demo (lihat "Data demo") |
