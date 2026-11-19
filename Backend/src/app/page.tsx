export default function Home() {
    return (
        <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-6">
            <h1 className="text-4xl font-bold text-primary">NusaTara</h1>
            <p className="text-muted">
                Starter: Next.js 16, Elysia (<code>/api</code>), Drizzle + PostgreSQL, Better Auth, Tailwind CSS 4.
            </p>
            <a className="text-primary underline" href="/api/labs">
                API docs → /api/labs
            </a>
        </main>
    );
}
