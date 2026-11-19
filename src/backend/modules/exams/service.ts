import { randomInt } from "node:crypto";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { status } from "elysia";
import type { AnswerKey, ExamQuestion, SubmissionAnswer } from "@/backend/utils/model";
import { isUniqueViolation, toOffset } from "@/backend/utils/query";
import { db } from "@/db";
import { EXAM_ACTIVE_PIN_INDEX, exams, learningModules, submissions } from "@/db/schema";
import type { CreateExamBody, ListExamsQuery, ResultsQuery, SubmitExamBody } from "./model";

/** Retries on PIN collision. With few active exams out of 10,000 PINs, one attempt almost always succeeds. */
const PIN_ATTEMPTS = 10;
/** A student rarely has more than a few attempts under one PIN; this just bounds the response. */
const RESULTS_LIMIT = 20;

const EXAM_NOT_FOUND = { message: "Ujian tidak ditemukan." };
// Codes let a student device decide what to do: keep its answers (EXAM_CLOSED) or ask for a new PIN (PIN_NOT_FOUND).
const PIN_NOT_FOUND = { code: "PIN_NOT_FOUND", message: "PIN ujian tidak ditemukan." };
const EXAM_CLOSED = { code: "EXAM_CLOSED", message: "Ujian sudah ditutup. Minta guru membukanya kembali." };
const ATTEMPT_CONFLICT = { code: "ATTEMPT_CONFLICT", message: "Kode percobaan ini sudah dipakai untuk ujian lain." };

const teacherExamColumns = {
    id: exams.id,
    moduleId: exams.moduleId,
    title: exams.title,
    pin: exams.pin,
    isActive: exams.isActive,
    questions: exams.questions,
    createdAt: exams.createdAt,
};

/** Cryptographically random so PINs can't be predicted from earlier ones. */
const generatePin = () => randomInt(0, 10_000).toString().padStart(4, "0");

const activeExamByPin = (pin: string) => and(eq(exams.pin, pin), eq(exams.isActive, true));

/** The active exam for a PIN. A PIN that only belongs to closed exams is reported as closed, not as unknown. */
async function findActiveExam(pin: string) {
    const [exam] = await db
        .select({ id: exams.id, title: exams.title, questions: exams.questions })
        .from(exams)
        .where(activeExamByPin(pin))
        .limit(1);
    if (exam) return exam;

    const [closed] = await db.select({ id: exams.id }).from(exams).where(eq(exams.pin, pin)).limit(1);
    if (closed) throw status(409, EXAM_CLOSED);
    throw status(404, PIN_NOT_FOUND);
}

const submissionColumns = {
    id: submissions.id,
    studentName: submissions.studentName,
    score: submissions.score,
    correctCount: submissions.correctCount,
    totalQuestions: submissions.totalQuestions,
    answers: submissions.answers,
    submittedAt: submissions.submittedAt,
};
type StoredSubmission = Pick<
    typeof submissions.$inferSelect,
    "id" | "studentName" | "score" | "correctCount" | "totalQuestions" | "answers" | "submittedAt"
>;

/** The result a student hears. Built from the stored row so a replay returns exactly what the first call did. */
const toSubmitResult = (row: StoredSubmission) => ({
    submissionId: row.id,
    studentName: row.studentName,
    score: row.score,
    correctCount: row.correctCount,
    totalQuestions: row.totalQuestions,
    answeredCount: row.answers.filter((a) => a.answer !== null).length,
    submittedAt: row.submittedAt,
});

/** A previously stored attempt, if any. Looked up by attempt id alone so it still works after the exam was closed. */
async function findAttempt(attemptId: string, pin: string) {
    const [row] = await db
        .select({ ...submissionColumns, pin: exams.pin })
        .from(submissions)
        .innerJoin(exams, eq(exams.id, submissions.examId))
        .where(eq(submissions.attemptId, attemptId))
        .limit(1);
    if (!row) return null;
    // The same attempt id arriving with another exam's PIN is a client bug, not a retry.
    if (row.pin !== pin) throw status(409, ATTEMPT_CONFLICT);
    return row;
}

export const ExamService = {
    /** PRD F-02: stores the question set and assigns a unique 4-digit PIN among active exams. */
    async create(teacherId: string, body: CreateExamBody) {
        if (body.moduleId) {
            const [owned] = await db
                .select({ id: learningModules.id })
                .from(learningModules)
                .where(and(eq(learningModules.id, body.moduleId), eq(learningModules.teacherId, teacherId)))
                .limit(1);
            if (!owned) throw status(404, { message: "Modul tidak ditemukan." });
        }

        const questions: ExamQuestion[] = body.questions.map((q, index) => ({
            id: index + 1,
            question: q.question.trim(),
            options: { A: q.options.A.trim(), B: q.options.B.trim(), C: q.options.C.trim(), D: q.options.D.trim() },
            correctAnswer: q.correctAnswer,
        }));

        for (let attempt = 0; attempt < PIN_ATTEMPTS; attempt++) {
            try {
                const [row] = await db
                    .insert(exams)
                    .values({
                        teacherId,
                        moduleId: body.moduleId ?? null,
                        title: body.title.trim(),
                        pin: generatePin(),
                        questions,
                    })
                    .returning(teacherExamColumns);
                return row;
            } catch (error) {
                // The partial unique index is the source of truth, so concurrent creates can't share a PIN.
                if (!isUniqueViolation(error, EXAM_ACTIVE_PIN_INDEX)) throw error;
            }
        }
        throw status(503, { message: "PIN ujian sedang penuh. Tutup ujian lama lalu coba lagi." });
    },

    /** Teacher dashboard: exams with submission count and average score, aggregated in SQL. */
    async listForTeacher(teacherId: string, { page = 1, pageSize = 10 }: ListExamsQuery) {
        const where = eq(exams.teacherId, teacherId);
        const [[{ total }], items] = await Promise.all([
            db.select({ total: count() }).from(exams).where(where),
            db
                .select({
                    id: exams.id,
                    moduleId: exams.moduleId,
                    title: exams.title,
                    pin: exams.pin,
                    isActive: exams.isActive,
                    questionCount: sql<number>`jsonb_array_length(${exams.questions})`.mapWith(Number),
                    submissionCount: count(submissions.id),
                    averageScore: sql<number | null>`round(avg(${submissions.score}))`.mapWith(Number),
                    createdAt: exams.createdAt,
                })
                .from(exams)
                .leftJoin(submissions, eq(submissions.examId, exams.id))
                .where(where)
                .groupBy(exams.id)
                .orderBy(desc(exams.createdAt), desc(exams.id))
                .limit(pageSize)
                .offset(toOffset(page, pageSize)),
        ]);
        return { items, total, page, pageSize };
    },

    /** Close (or reopen) an exam. Closing stops submissions and frees the PIN. */
    async setActive(teacherId: string, id: string, isActive: boolean) {
        try {
            const [row] = await db
                .update(exams)
                .set({ isActive })
                .where(and(eq(exams.id, id), eq(exams.teacherId, teacherId)))
                .returning(teacherExamColumns);
            if (!row) throw status(404, EXAM_NOT_FOUND);
            return row;
        } catch (error) {
            if (isUniqueViolation(error, EXAM_ACTIVE_PIN_INDEX)) {
                throw status(409, {
                    code: "PIN_CONFLICT",
                    message:
                        "PIN ujian ini sudah dipakai ujian aktif lain. Buat ujian baru untuk mendapatkan PIN baru.",
                });
            }
            throw error;
        }
    },

    /** PRD GET /exams/:pin: questions for the voice exam, with the answer key stripped. */
    async getByPin(pin: string) {
        const exam = await findActiveExam(pin);

        return {
            id: exam.id,
            title: exam.title,
            questionCount: exam.questions.length,
            questions: exam.questions.map(({ id, question, options }) => ({ id, question, options })),
        };
    },

    /**
     * Student "Cek Nilai": scores for one name under a PIN, newest first. Includes closed exams so results stay
     * visible after the teacher closes the exam. Only the PIN and the exact name (case-insensitive) unlock them.
     */
    async results(pin: string, { name }: ResultsQuery) {
        const items = await db
            .select({
                examTitle: exams.title,
                studentName: submissions.studentName,
                score: submissions.score,
                correctCount: submissions.correctCount,
                totalQuestions: submissions.totalQuestions,
                submittedAt: submissions.submittedAt,
            })
            .from(submissions)
            .innerJoin(exams, eq(exams.id, submissions.examId))
            .where(and(eq(exams.pin, pin), sql`lower(btrim(${submissions.studentName})) = lower(btrim(${name}))`))
            .orderBy(desc(submissions.submittedAt), desc(submissions.id))
            .limit(RESULTS_LIMIT);
        return { items };
    },

    /**
     * PRD POST /exams/:pin/submit: scores on the server; the answer key is never sent back.
     * Idempotent per `attemptId`: a retry returns the stored result and creates nothing, even if the exam
     * was closed after the first call. The answers of a replay are ignored; the first submission wins.
     */
    async submit(pin: string, body: SubmitExamBody) {
        const stored = await findAttempt(body.attemptId, pin);
        if (stored) return { result: toSubmitResult(stored), replayed: true };

        const exam = await findActiveExam(pin);

        const questionIds = new Set(exam.questions.map((q) => q.id));
        const chosen = new Map<number, AnswerKey>();
        for (const { questionId, answer } of body.answers) {
            if (!questionIds.has(questionId)) {
                throw status(400, { message: `Soal nomor ${questionId} tidak ada dalam ujian ini.` });
            }
            chosen.set(questionId, answer); // the last answer wins, so students can change their mind
        }

        const answers: SubmissionAnswer[] = exam.questions.map((q) => {
            const answer = chosen.get(q.id) ?? null;
            return { questionId: q.id, answer, isCorrect: answer === q.correctAnswer };
        });
        const totalQuestions = answers.length;
        const correctCount = answers.filter((a) => a.isCorrect).length;
        const score = Math.round((correctCount / totalQuestions) * 100);
        const studentName = body.studentName.trim();

        const [row] = await db
            .insert(submissions)
            .values({
                examId: exam.id,
                attemptId: body.attemptId,
                studentName,
                answers,
                score,
                correctCount,
                totalQuestions,
            })
            .onConflictDoNothing({ target: submissions.attemptId })
            .returning(submissionColumns);
        if (row) return { result: toSubmitResult(row), replayed: false };

        // Two retries of one attempt raced; the other one stored it first.
        const raced = await findAttempt(body.attemptId, pin);
        if (raced) return { result: toSubmitResult(raced), replayed: true };
        throw status(409, ATTEMPT_CONFLICT);
    },
};
