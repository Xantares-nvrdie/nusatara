import { relations } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import type { DeafVisualSummary } from "@/backend/utils/model";
import { user } from "./auth";

/** Teaching material converted into accessible formats (PRD table `modules`). */
export const learningModules = pgTable(
    "modules",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        teacherId: text("teacher_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        title: varchar("title", { length: 200 }).notNull(),
        rawContent: text("raw_content").notNull(),
        blindAudioScript: text("blind_audio_script").notNull(),
        deafVisualSummary: jsonb("deaf_visual_summary").$type<DeafVisualSummary>().notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index("modules_created_at_idx").on(table.createdAt),
        index("modules_teacher_id_created_at_idx").on(table.teacherId, table.createdAt),
    ],
);

export const learningModulesRelations = relations(learningModules, ({ one }) => ({
    teacher: one(user, { fields: [learningModules.teacherId], references: [user.id] }),
}));
