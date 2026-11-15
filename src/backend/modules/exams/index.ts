import { Elysia, status } from "elysia";
import betterAuthMiddleware from "@/backend/utils/better-auth/middleware";
import { ExamModel as M } from "./model";
import { ExamService } from "./service";

/**
 * Teacher routes require a session. Student routes (`/:pin`, `/:pin/submit`) are public
 * so a shared school device can be used without per-student accounts.
 */
const examsModule = new Elysia({ prefix: "/exams", tags: ["Exams"] })
    .use(betterAuthMiddleware)
    .post("/", async ({ user, body }) => status(201, await ExamService.create(user.id, body)), {
        auth: true,
        body: M.createBody,
        response: { 201: M.teacherExam, 404: M.error, 503: M.error },
        detail: { summary: "Create an exam session and generate its 4-digit PIN" },
    })
    .get("/", ({ user, query }) => ExamService.listForTeacher(user.id, query), {
        auth: true,
        query: M.listQuery,
        response: { 200: M.listResponse },
        detail: { summary: "List the signed-in teacher's exams with score stats" },
    })
    .patch("/:id", ({ user, params, body }) => ExamService.setActive(user.id, params.id, body.isActive), {
        auth: true,
        params: M.idParams,
        body: M.updateBody,
        response: { 200: M.teacherExam, 404: M.error, 409: M.error },
        detail: { summary: "Close or reopen an exam" },
    })
    .get("/:pin", ({ params }) => ExamService.getByPin(params.pin), {
        params: M.pinParams,
        response: { 200: M.publicExam, 404: M.error },
        detail: { summary: "Validate a PIN and get questions for the voice exam (no answer key)" },
    })
    .post("/:pin/submit", async ({ params, body }) => status(201, await ExamService.submit(params.pin, body)), {
        params: M.pinParams,
        body: M.submitBody,
        response: { 201: M.submitResponse, 400: M.error, 404: M.error },
        detail: { summary: "Submit answers and get the score" },
    });

export default examsModule;
