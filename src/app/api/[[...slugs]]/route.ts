import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import profileModule from "@/backend/modules/profile";
import betterAuthView from "@/backend/utils/better-auth";

export const app = new Elysia({ prefix: "/api" })
    .use(
        openapi({
            path: "/labs",
            documentation: {
                info: {
                    title: "NusaTara API",
                    version: "0.1.0",
                },
            },
        }),
    )
    /* HEALTH */
    .get("/health", () => ({ status: "ok" }), { detail: { summary: "Health check", tags: ["System"] } })
    /* AUTH */
    .all("/auth/*", betterAuthView, { detail: { hide: true } })
    /* FEATURE MODULES */
    .use(profileModule);

export type App = typeof app;

export const maxDuration = 60;
export const GET = app.fetch;
export const POST = app.fetch;
export const PUT = app.fetch;
export const PATCH = app.fetch;
export const DELETE = app.fetch;
