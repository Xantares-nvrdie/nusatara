import { randomInt } from "node:crypto";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { status } from "elysia";
import type { AnswerKey, ExamQuestion, SubmissionAnswer } from "@/backend/utils/model";
import { isUniqueViolation, toOffset } from "@/backend/utils/query";
import { db } from "@/db";
import { EXAM_ACTIVE_PIN_INDEX, exams, learningModules, submissions } from "@/db/schema";
import type { CreateExamBody, ListExamsQuery, SubmitExamBody } from "./model";

/** Retries on PIN collision. With few active exams out of 10,000 PINs, one attempt almost always succeeds. */
const PIN_ATTEMPTS = 10;

const EXAM_NOT_FOUND = { message: "Ujian tidak ditemukan." };
const PIN_NOT_FOUND = { message: "PIN ujian tidak ditemukan atau ujian sudah ditutup." };

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
                    message:
                        "PIN ujian ini sudah dipakai ujian aktif lain. Buat ujian baru untuk mendapatkan PIN baru.",
                });
            }
            throw error;
        }
    },

    /** PRD GET /exams/:pin: questions for the voice exam, with the answer key stripped. */
    async getByPin(pin: string) {
        const [exam] = await db
            .select({ id: exams.id, title: exams.title, questions: exams.questions })
            .from(exams)
            .where(activeExamByPin(pin))
            .limit(1);
        if (!exam) throw status(404, PIN_NOT_FOUND);

        return {
            id: exam.id,
            title: exam.title,
            questionCount: exam.questions.length,
            questions: exam.questions.map(({ id, question, options }) => ({ id, question, options })),
        };
    },

    /** PRD POST /exams/:pin/submit: scores on the server; the answer key is never sent back. */
    async submit(pin: string, body: SubmitExamBody) {
        const [exam] = await db
            .select({ id: exams.id, questions: exams.questions })
            .from(exams)
            .where(activeExamByPin(pin))
            .limit(1);
        if (!exam) throw status(404, PIN_NOT_FOUND);

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
            .values({ examId: exam.id, studentName, answers, score, correctCount, totalQuestions })
            .returning({ id: submissions.id, submittedAt: submissions.submittedAt });

        return {
            submissionId: row.id,
            studentName,
            score,
            correctCount,
            totalQuestions,
            answeredCount: chosen.size,
            submittedAt: row.submittedAt,
        };
    },
};
