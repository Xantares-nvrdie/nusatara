import { Elysia, status } from "elysia";
import betterAuthMiddleware from "@/backend/utils/better-auth/middleware";
import { SignLogModel as M } from "./model";
import { SignLogService } from "./service";

const signLogsModule = new Elysia({ prefix: "/sign-logs", tags: ["Sign Logs"] })
    .use(betterAuthMiddleware)
    .post("/", async ({ user, body }) => status(201, await SignLogService.create(user?.id ?? null, body)), {
        optionalAuth: true,
        body: M.createBody,
        response: { 201: M.signLog },
        detail: {
            summary: "Save a sign-language transcript (public)",
            description: "Linked to the teacher when the device has a signed-in session, otherwise stored unassigned.",
        },
    })
    .get("/", ({ user, query }) => SignLogService.listForTeacher(user.id, query), {
        auth: true,
        query: M.listQuery,
        response: { 200: M.listResponse },
        detail: { summary: "List sign-language transcripts for the teacher dashboard" },
    });

export default signLogsModule;
