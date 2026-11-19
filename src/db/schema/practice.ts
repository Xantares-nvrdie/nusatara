import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import type { AnswerKey, ExamQuestionInput } from "@/backend/utils/model";
import { learningModules } from "./learning-modules";

/**
 * Practice questions for the student "Latihan Suara" page. Unlike exam questions, the answer key and an
 * explanation are public: students get feedback right after each answer and nothing is graded.
 * They belong to a module, so deleting the module (or re-seeding it) removes them too.
 */
export const practiceQuestions = pgTable(
    "practice_questions",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        moduleId: uuid("module_id")
            .notNull()
            .references(() => learningModules.id, { onDelete: "cascade" }),
        question: text("question").notNull(),
        options: jsonb("options").$type<ExamQuestionInput["options"]>().notNull(),
        correctAnswer: varchar("correct_answer", { length: 1 }).$type<AnswerKey>().notNull(),
        explanation: text("explanation").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        check("practice_questions_correct_answer_chk", sql`${table.correctAnswer} in ('A', 'B', 'C', 'D')`),
        index("practice_questions_module_id_idx").on(table.moduleId),
    ],
);
