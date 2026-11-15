# NusaTara

Starter mengikuti stack INKLUSA.

| Lapisan | Teknologi |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, Framer Motion, Lucide React |
| Backend & API | Elysia.js (di-*mount* pada `/api`), OpenAPI di `/api/labs` |
| Autentikasi | Better Auth (email/password, Google OAuth opsional, plugin admin) |
| Basis Data | PostgreSQL, Drizzle ORM, Drizzle Kit |
| Tooling | Bun, TypeScript 5, Biome |

## Menjalankan

```bash
bun install
cp .env.example .env   # isi DATABASE_URL, DIRECT_URL, BETTER_AUTH_SECRET
bun run db:push        # buat tabel auth di database
bun run dev
```

## Struktur

```
src/
├── app/
│   ├── api/[[...slugs]]/route.ts   # Elysia app, semua endpoint di /api
│   ├── layout.tsx
│   └── page.tsx
├── auth.ts                         # Konfigurasi Better Auth
├── backend/
│   ├── modules/<fitur>/            # index.ts (routes), model.ts (validasi), service.ts (query db)
│   └── utils/better-auth/          # handler /api/auth/* dan macro { auth } / { adminOnly }
├── db/
│   ├── index.ts                    # Koneksi Drizzle + pg Pool
│   └── schema/                     # Tabel Drizzle (daftarkan di schema/index.ts)
└── lib/                            # api() fetch helper, auth-client, cn()
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
