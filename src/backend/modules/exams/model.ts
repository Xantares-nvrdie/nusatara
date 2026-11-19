import { t } from "elysia";
import {
    AnswerKey,
    ErrorResponse,
    ExamQuestion,
    ExamQuestionInput,
    IdParams,
    NonEmptyString,
    Paginated,
    PaginationQuery,
    PublicExamQuestion,
} from "@/backend/utils/model";

export const MAX_EXAM_QUESTIONS = 50;

/** Teacher view: includes the PIN and the answer key. */
const TeacherExam = t.Object({
    id: t.String(),
    moduleId: t.Nullable(t.String()),
    title: t.String(),
    pin: t.String(),
    isActive: t.Boolean(),
    questions: t.Array(ExamQuestion),
    createdAt: t.Date(),
});

const TeacherExamListItem = t.Object({
    id: t.String(),
    moduleId: t.Nullable(t.String()),
    title: t.String(),
    pin: t.String(),
    isActive: t.Boolean(),
    questionCount: t.Integer(),
    submissionCount: t.Integer(),
    averageScore: t.Nullable(t.Integer()),
    createdAt: t.Date(),
});

export const ExamModel = {
    idParams: IdParams,
    pinParams: t.Object({ pin: t.String({ pattern: "^[0-9]{4}$", description: "PIN ujian 4 digit" }) }),
    listQuery: PaginationQuery,
    createBody: t.Object({
        title: NonEmptyString(200),
        moduleId: t.Optional(t.String({ format: "uuid", description: "Modul sumber milik guru (opsional)" })),
        questions: t.Array(ExamQuestionInput, { minItems: 1, maxItems: MAX_EXAM_QUESTIONS }),
    }),
    updateBody: t.Object({
        isActive: t.Boolean({ description: "false = tutup ujian (PIN bisa dipakai ulang), true = buka kembali" }),
    }),
    submitBody: t.Object({
        attemptId: t.String({
            format: "uuid",
            description:
                "UUID dibuat perangkat siswa saat ujian dimulai. Kirim ulang dengan ID yang sama mengembalikan hasil yang sama, tanpa nilai ganda.",
        }),
        studentName: NonEmptyString(100),
        answers: t.Array(
            t.Object({
                questionId: t.Integer({ minimum: 1, description: "Nomor soal (id dari GET /exams/:pin)" }),
                answer: AnswerKey,
            }),
            {
                maxItems: 200,
                description: "Soal yang tidak dijawab boleh dilewati. Jawaban terakhir untuk nomor yang sama dipakai.",
            },
        ),
    }),
    teacherExam: TeacherExam,
    listResponse: Paginated(TeacherExamListItem),
    /** Student view (PRD GET /exams/:pin): never contains `correctAnswer`. */
    publicExam: t.Object({
        id: t.String(),
        title: t.String(),
        questionCount: t.Integer(),
        questions: t.Array(PublicExamQuestion),
    }),
    resultsQuery: t.Object({
        name: NonEmptyString(100, {
            description: "Nama siswa persis seperti saat ujian (huruf besar/kecil diabaikan)",
        }),
    }),
    /** Student "Cek Nilai": scores only, never the answers or the answer key. */
    resultsResponse: t.Object({
        items: t.Array(
            t.Object({
                examTitle: t.String(),
                studentName: t.String(),
                score: t.Integer(),
                correctCount: t.Integer(),
                totalQuestions: t.Integer(),
                submittedAt: t.Date(),
            }),
        ),
    }),
    submitResponse: t.Object({
        submissionId: t.String(),
        studentName: t.String(),
        score: t.Integer(),
        correctCount: t.Integer(),
        totalQuestions: t.Integer(),
        answeredCount: t.Integer(),
        submittedAt: t.Date(),
    }),
    error: ErrorResponse,
} as const;

export type CreateExamBody = typeof ExamModel.createBody.static;
export type SubmitExamBody = typeof ExamModel.submitBody.static;
export type ListExamsQuery = typeof ExamModel.listQuery.static;
export type ResultsQuery = typeof ExamModel.resultsQuery.static;
