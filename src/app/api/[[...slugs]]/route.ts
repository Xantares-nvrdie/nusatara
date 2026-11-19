import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import examsModule from "@/backend/modules/exams";
import learningModulesModule from "@/backend/modules/learning-modules";
import practiceModule from "@/backend/modules/practice";
import profileModule from "@/backend/modules/profile";
import submissionsModule from "@/backend/modules/submissions";
import betterAuthView from "@/backend/utils/better-auth";
import errorHandler from "@/backend/utils/error";

export const app = new Elysia({ prefix: "/api" })
    .use(errorHandler)
    .use(
        openapi({
            path: "/labs",
            documentation: {
                info: {
                    title: "NusaTara API",
                    version: "0.1.0",
                    description:
                        "Platform pembelajaran & ujian inklusif untuk siswa tunanetra dan tunarungu di daerah 3T.",
                },
            },
        }),
    )
    /* HEALTH */
    .get("/health", () => ({ status: "ok" }))
    /* AUTH */
    .all("/auth/*", betterAuthView, { detail: { hide: true } })
    /* FEATURE MODULES */
    .use(profileModule)
    .use(learningModulesModule)
    .use(examsModule)
    .use(submissionsModule)
    .use(practiceModule);

export type App = typeof app;

// A conversion takes ~30-50 s and may fall back from the AI gateway (SumoPod) to Google's Gemini models.
// generateStructured (backend/utils/gemini.ts) gives up after at most 200 s, so it can still answer with a clean
// error before this limit. (Vercel Fluid compute allows up to 300 s on every plan.)
export const maxDuration = 210;
export const GET = app.fetch;
export const POST = app.fetch;
export const PUT = app.fetch;
export const PATCH = app.fetch;
export const DELETE = app.fetch;
export const OPTIONS = app.fetch;
