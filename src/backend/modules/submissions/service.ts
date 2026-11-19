import { and, count, desc, eq } from "drizzle-orm";
import { toOffset } from "@/backend/utils/query";
import { db } from "@/db";
import { exams, submissions } from "@/db/schema";
import type { ListSubmissionsQuery } from "./model";

export const SubmissionService = {
    /** Scores for the teacher's own exams only; other teachers' exam ids simply return nothing. */
    async listForTeacher(teacherId: string, { page = 1, pageSize = 10, examId }: ListSubmissionsQuery) {
        const where = and(eq(exams.teacherId, teacherId), examId ? eq(submissions.examId, examId) : undefined);

        const [[{ total }], items] = await Promise.all([
            db
                .select({ total: count() })
                .from(submissions)
                .innerJoin(exams, eq(exams.id, submissions.examId))
                .where(where),
            db
                .select({
                    id: submissions.id,
                    examId: submissions.examId,
                    examTitle: exams.title,
                    studentName: submissions.studentName,
                    score: submissions.score,
                    correctCount: submissions.correctCount,
                    totalQuestions: submissions.totalQuestions,
                    answers: submissions.answers,
                    submittedAt: submissions.submittedAt,
                })
                .from(submissions)
                .innerJoin(exams, eq(exams.id, submissions.examId))
                .where(where)
                .orderBy(desc(submissions.submittedAt), desc(submissions.id))
                .limit(pageSize)
                .offset(toOffset(page, pageSize)),
        ]);
        return { items, total, page, pageSize };
    },
};
