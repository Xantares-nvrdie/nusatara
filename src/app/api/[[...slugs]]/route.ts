import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import examsModule from "@/backend/modules/exams";
import learningModulesModule from "@/backend/modules/learning-modules";
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
    .use(submissionsModule);

export type App = typeof app;

// Gemini conversion can take tens of seconds; the Gemini client times out at 50s to answer before this limit.
export const maxDuration = 60;
export const GET = app.fetch;
export const POST = app.fetch;
export const PUT = app.fetch;
export const PATCH = app.fetch;
export const DELETE = app.fetch;
export const OPTIONS = app.fetch;
