import { Elysia, status } from "elysia";
import betterAuthMiddleware from "@/backend/utils/better-auth/middleware";
import { GLOSSARY_MODULE_LIMIT, LearningModuleModel as M } from "./model";
import { LearningModuleService } from "./service";

const learningModulesModule = new Elysia({ prefix: "/modules", tags: ["Modules"] })
    .use(betterAuthMiddleware)
    .post("/convert", ({ body }) => LearningModuleService.convert(body), {
        auth: true,
        body: M.convertBody,
        response: {
            200: M.convertResponse,
            400: M.error,
            415: M.error,
            422: M.error,
            429: M.error,
            502: M.error,
            503: M.error,
            504: M.error,
        },
        detail: {
            summary: "Convert material with Gemini (not saved)",
            description:
                "Send `content` (JSON or form) or `file` (multipart, PDF/TXT up to 4 MB). Returns the blind audio script, the deaf visual summary, and draft questions. Save with POST /modules and POST /exams.",
        },
    })
    .post("/", async ({ user, body }) => status(201, await LearningModuleService.create(user, body)), {
        auth: true,
        body: M.createBody,
        response: { 201: M.detail },
        detail: { summary: "Save a converted module" },
    })
    .get("/", ({ query }) => LearningModuleService.list(query), {
        query: M.listQuery,
        response: { 200: M.listResponse },
        detail: { summary: "List modules (public, for teacher and student portals)" },
    })
    .get("/mine", ({ user, query }) => LearningModuleService.list(query, user.id), {
        auth: true,
        query: M.listQuery,
        response: { 200: M.listResponse },
        detail: { summary: "List modules created by the signed-in teacher" },
    })
    .get("/glossary", () => LearningModuleService.glossary(), {
        response: { 200: M.glossaryResponse },
        detail: {
            summary: "Glossary terms from all modules (public)",
            description: `Term + definition pairs from each module's deafVisualSummary.glossary (newest ${GLOSSARY_MODULE_LIMIT} modules), sorted A-Z.`,
        },
    })
    .get("/:id", ({ params }) => LearningModuleService.getById(params.id), {
        params: M.params,
        response: { 200: M.detail, 404: M.error },
        detail: { summary: "Get module content (public)" },
    });

export default learningModulesModule;
