import { t } from "elysia";
import { AnswerKey, ExamQuestionInput, NonEmptyString, QuestionOptions } from "@/backend/utils/model";

export const MAX_PRACTICE_QUESTIONS = 20;

/** A practice question as written in the seed (or later by a teacher): an exam question plus an explanation. */
export const PracticeQuestionInput = t.Object({
    ...ExamQuestionInput.properties,
    explanation: NonEmptyString(1000, {
        description: "Penjelasan singkat yang dibacakan setelah siswa menjawab.",
    }),
});

const PracticeQuestion = t.Object({
    id: t.String(),
    moduleId: t.String(),
    moduleTitle: t.String(),
    question: t.String(),
    options: QuestionOptions,
    correctAnswer: AnswerKey,
    explanation: t.String(),
});

export const PracticeModel = {
    listQuery: t.Object({
        moduleId: t.Optional(t.String({ format: "uuid", description: "Hanya soal dari modul ini" })),
        limit: t.Optional(
            t.Integer({ minimum: 1, maximum: MAX_PRACTICE_QUESTIONS, default: 10, description: "Jumlah soal" }),
        ),
    }),
    listResponse: t.Object({ items: t.Array(PracticeQuestion) }),
} as const;

export type ListPracticeQuery = typeof PracticeModel.listQuery.static;
