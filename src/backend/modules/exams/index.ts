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
        response: { 200: M.publicExam, 404: M.error, 409: M.error },
        detail: { summary: "Validate a PIN and get questions for the voice exam (no answer key)" },
    })
    .get("/:pin/results", ({ params, query }) => ExamService.results(params.pin, query), {
        params: M.pinParams,
        query: M.resultsQuery,
        response: { 200: M.resultsResponse },
        detail: {
            summary: "A student's own scores for a PIN (public, needs the exact name)",
            description:
                "For the student 'Cek Nilai' page. Returns scores only, never answers. Empty list when nothing matches.",
        },
    })
    .post(
        "/:pin/submit",
        async ({ params, body }) => {
            const { result, replayed } = await ExamService.submit(params.pin, body);
            return status(replayed ? 200 : 201, result);
        },
        {
            params: M.pinParams,
            body: M.submitBody,
            response: { 200: M.submitResponse, 201: M.submitResponse, 400: M.error, 404: M.error, 409: M.error },
            detail: {
                summary: "Submit answers and get the score (safe to retry)",
                description:
                    "201 on the first call, 200 when the same `attemptId` was already stored. 409 with code EXAM_CLOSED when the exam is closed, 404 with code PIN_NOT_FOUND for an unknown PIN.",
            },
        },
    );

export default examsModule;
