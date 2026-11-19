import { t } from "elysia";
import { Paginated, PaginationQuery, SubmissionAnswer } from "@/backend/utils/model";

const SubmissionItem = t.Object({
    id: t.String(),
    examId: t.String(),
    examTitle: t.String(),
    studentName: t.String(),
    score: t.Integer(),
    correctCount: t.Integer(),
    totalQuestions: t.Integer(),
    answers: t.Array(SubmissionAnswer),
    submittedAt: t.Date(),
});

export const SubmissionModel = {
    listQuery: t.Object({
        ...PaginationQuery.properties,
        examId: t.Optional(t.String({ format: "uuid", description: "Filter satu ujian" })),
    }),
    listResponse: Paginated(SubmissionItem),
} as const;

export type ListSubmissionsQuery = typeof SubmissionModel.listQuery.static;
