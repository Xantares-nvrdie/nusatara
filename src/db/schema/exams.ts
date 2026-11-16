import { relations, sql } from "drizzle-orm";
import {
    boolean,
    check,
    index,
    integer,
    jsonb,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";
import type { ExamQuestion, SubmissionAnswer } from "@/backend/utils/model";
import { user } from "./auth";
import { learningModules } from "./learning-modules";

export const EXAM_ACTIVE_PIN_INDEX = "exams_active_pin_uidx";

export const exams = pgTable(
    "exams",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        teacherId: text("teacher_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        // Nullable so teachers can also build a manual exam without a source module.
        moduleId: uuid("module_id").references(() => learningModules.id, { onDelete: "set null" }),
        title: varchar("title", { length: 200 }).notNull(),
        pin: varchar("pin", { length: 4 }).notNull(),
        questions: jsonb("questions").$type<ExamQuestion[]>().notNull(),
        // Closing an exam stops new submissions and frees its PIN for reuse.
        isActive: boolean("is_active").default(true).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        // A 4-digit PIN only has 10,000 values, so uniqueness is enforced among active exams only.
        uniqueIndex(EXAM_ACTIVE_PIN_INDEX)
            .on(table.pin)
            .where(sql`${table.isActive}`),
        check("exams_pin_format_chk", sql`${table.pin} ~ '^[0-9]{4}$'`),
        index("exams_teacher_id_created_at_idx").on(table.teacherId, table.createdAt),
        index("exams_module_id_idx").on(table.moduleId),
    ],
);

export const submissions = pgTable(
    "submissions",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        examId: uuid("exam_id")
            .notNull()
            .references(() => exams.id, { onDelete: "cascade" }),
        // Created by the student device when an exam starts and sent with the answers, so a retry
        // (lost response, offline outbox) is recognised and never stored twice.
        attemptId: uuid("attempt_id").notNull(),
        studentName: varchar("student_name", { length: 100 }).notNull(),
        answers: jsonb("answers").$type<SubmissionAnswer[]>().notNull(),
        score: integer("score").notNull(),
        correctCount: integer("correct_count").notNull(),
        totalQuestions: integer("total_questions").notNull(),
        submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex("submissions_attempt_id_uidx").on(table.attemptId),
        check("submissions_score_range_chk", sql`${table.score} between 0 and 100`),
        index("submissions_exam_id_submitted_at_idx").on(table.examId, table.submittedAt),
    ],
);

export const examsRelations = relations(exams, ({ one, many }) => ({
    teacher: one(user, { fields: [exams.teacherId], references: [user.id] }),
    module: one(learningModules, { fields: [exams.moduleId], references: [learningModules.id] }),
    submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
    exam: one(exams, { fields: [submissions.examId], references: [exams.id] }),
}));
