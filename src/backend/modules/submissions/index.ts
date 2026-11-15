import { Elysia } from "elysia";
import betterAuthMiddleware from "@/backend/utils/better-auth/middleware";
import { SubmissionModel as M } from "./model";
import { SubmissionService } from "./service";

const submissionsModule = new Elysia({ prefix: "/submissions", tags: ["Exams"] })
    .use(betterAuthMiddleware)
    .get("/", ({ user, query }) => SubmissionService.listForTeacher(user.id, query), {
        auth: true,
        query: M.listQuery,
        response: { 200: M.listResponse },
        detail: { summary: "List student scores for the signed-in teacher's exams" },
    });

export default submissionsModule;
