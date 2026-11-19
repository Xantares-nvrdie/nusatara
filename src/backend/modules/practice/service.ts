import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { learningModules, practiceQuestions } from "@/db/schema";
import type { ListPracticeQuery } from "./model";

export const PracticeService = {
    /** A random set each time, so repeating "Latihan Suara" doesn't always start with the same question. */
    async list({ moduleId, limit = 10 }: ListPracticeQuery) {
        const items = await db
            .select({
                id: practiceQuestions.id,
                moduleId: practiceQuestions.moduleId,
                moduleTitle: learningModules.title,
                question: practiceQuestions.question,
                options: practiceQuestions.options,
                correctAnswer: practiceQuestions.correctAnswer,
                explanation: practiceQuestions.explanation,
            })
            .from(practiceQuestions)
            .innerJoin(learningModules, eq(learningModules.id, practiceQuestions.moduleId))
            .where(moduleId ? eq(practiceQuestions.moduleId, moduleId) : undefined)
            .orderBy(sql`random()`)
            .limit(limit);
        return { items };
    },
};
