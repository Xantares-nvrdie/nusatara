import { type Static, type TSchema, t } from "elysia";

/** Shared DTOs reused across backend modules. */
export const IdParams = t.Object({ id: t.String({ format: "uuid" }) });
export const SlugParams = t.Object({ slug: t.String() });

/**
 * Standard error body. The frontend `api()` helper shows `message` in a toast.
 * `code` is a stable machine-readable reason (e.g. EXAM_CLOSED) for clients that must react to it.
 */
export const ErrorResponse = t.Object({ message: t.String(), code: t.Optional(t.String()) });

/** String that must contain at least one non-whitespace character. Services trim before saving. */
export const NonEmptyString = (maxLength: number, options: { description?: string } = {}) =>
    t.String({ minLength: 1, maxLength, pattern: "\\S", ...options });

export const PaginationQuery = t.Object({
    page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
    pageSize: t.Optional(t.Integer({ minimum: 1, maximum: 50, default: 10 })),
});

export const Paginated = <T extends TSchema>(item: T) =>
    t.Object({
        items: t.Array(item),
        total: t.Integer(),
        page: t.Integer(),
        pageSize: t.Integer(),
    });

/* ------------------------------------------------------------------ */
/* Learning content shapes, stored as JSONB and produced by Gemini.    */
/* Field descriptions double as instructions for Gemini structured     */
/* output (see backend/utils/gemini.ts), so keep them precise.         */
/* ------------------------------------------------------------------ */

export const AnswerKey = t.UnionEnum(["A", "B", "C", "D"]);
export type AnswerKey = Static<typeof AnswerKey>;
export const ANSWER_KEYS = ["A", "B", "C", "D"] as const satisfies readonly AnswerKey[];

const OptionText = NonEmptyString(500, { description: "Teks pilihan jawaban, singkat dan mudah dibacakan." });

export const QuestionOptions = t.Object({ A: OptionText, B: OptionText, C: OptionText, D: OptionText });

/** A multiple-choice question as written by the teacher or drafted by AI (no id yet). */
export const ExamQuestionInput = t.Object({
    question: NonEmptyString(2000, {
        description: "Teks soal yang bisa dipahami hanya dengan didengar, tanpa merujuk gambar.",
    }),
    options: QuestionOptions,
    correctAnswer: AnswerKey,
});
export type ExamQuestionInput = Static<typeof ExamQuestionInput>;

/** A stored question. `id` is its 1-based position, which is also the number read aloud to students. */
export const ExamQuestion = t.Object({
    id: t.Integer({ minimum: 1 }),
    question: t.String(),
    options: QuestionOptions,
    correctAnswer: AnswerKey,
});
export type ExamQuestion = Static<typeof ExamQuestion>;

/** Question as shown to students: the answer key is never included. */
export const PublicExamQuestion = t.Object({
    id: t.Integer(),
    question: t.String(),
    options: QuestionOptions,
});

export const DeafVisualSummary = t.Object({
    summary: NonEmptyString(1000, { description: "Inti materi dalam 1-2 kalimat pendek dan lugas." }),
    sections: t.Array(
        t.Object({
            heading: NonEmptyString(200, { description: "Judul bagian, maksimal 6 kata." }),
            points: t.Array(NonEmptyString(500), {
                minItems: 1,
                maxItems: 10,
                description: "2-5 poin. Satu ide per poin, maksimal 15 kata, kalimat aktif.",
            }),
        }),
        { minItems: 1, maxItems: 12, description: "2-6 bagian yang memecah materi panjang menjadi poin terstruktur." },
    ),
    conceptMap: t.Object(
        {
            central: NonEmptyString(200, { description: "Konsep utama materi." }),
            branches: t.Array(
                t.Object({
                    label: NonEmptyString(200, { description: "Sub-konsep." }),
                    children: t.Array(NonEmptyString(300), {
                        maxItems: 10,
                        description: "0-4 rincian singkat dari sub-konsep.",
                    }),
                }),
                { minItems: 1, maxItems: 12, description: "2-6 cabang sub-konsep." },
            ),
        },
        { description: "Peta konsep satu tingkat untuk ditampilkan sebagai diagram." },
    ),
    glossary: t.Array(
        t.Object({
            term: NonEmptyString(200, { description: "Istilah sulit dari materi." }),
            definition: NonEmptyString(1000, {
                description: "Arti istilah dengan kata sehari-hari, maksimal 20 kata.",
            }),
        }),
        { maxItems: 30, description: "3-10 istilah sulit beserta artinya." },
    ),
});
export type DeafVisualSummary = Static<typeof DeafVisualSummary>;

/** One answer in a stored submission. `answer` is null when the student skipped the question. */
export const SubmissionAnswer = t.Object({
    questionId: t.Integer(),
    answer: t.Nullable(AnswerKey),
    isCorrect: t.Boolean(),
});
export type SubmissionAnswer = Static<typeof SubmissionAnswer>;
