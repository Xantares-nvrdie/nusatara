import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { user } from "./auth";

/** CAMERA = MediaPipe sign translation, QUICK_CARD = tapped phrase card (PRD F-05 / F-06). */
export const SIGN_LOG_SOURCES = ["CAMERA", "QUICK_CARD"] as const;

/** Sign-language translations from deaf students, shown on the teacher dashboard. */
export const signLogs = pgTable(
    "sign_logs",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        // Set when the shared device has a signed-in teacher; null for anonymous (device-sharing) use.
        teacherId: text("teacher_id").references(() => user.id, { onDelete: "cascade" }),
        studentName: varchar("student_name", { length: 100 }),
        transcript: text("transcript").notNull(),
        source: varchar("source", { length: 20, enum: SIGN_LOG_SOURCES }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [index("sign_logs_teacher_id_created_at_idx").on(table.teacherId, table.createdAt)],
);

export const signLogsRelations = relations(signLogs, ({ one }) => ({
    teacher: one(user, { fields: [signLogs.teacherId], references: [user.id] }),
}));
