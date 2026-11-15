import { and, count, desc, eq, gt, isNull, or } from "drizzle-orm";
import { toOffset } from "@/backend/utils/query";
import { db } from "@/db";
import { signLogs } from "@/db/schema";
import type { CreateSignLogBody, ListSignLogsQuery } from "./model";

const signLogColumns = {
    id: signLogs.id,
    studentName: signLogs.studentName,
    transcript: signLogs.transcript,
    source: signLogs.source,
    createdAt: signLogs.createdAt,
};

export const SignLogService = {
    async create(teacherId: string | null, body: CreateSignLogBody) {
        const [row] = await db
            .insert(signLogs)
            .values({
                teacherId,
                studentName: body.studentName?.trim() || null,
                transcript: body.transcript.trim(),
                source: body.source,
            })
            .returning(signLogColumns);
        return row;
    },

    /**
     * Logs linked to this teacher plus unassigned logs (sent from a device with nobody signed in).
     * `after` lets the dashboard poll only new entries, which keeps polling cheap on slow connections.
     */
    async listForTeacher(teacherId: string, { page = 1, pageSize = 10, after }: ListSignLogsQuery) {
        const where = and(
            or(eq(signLogs.teacherId, teacherId), isNull(signLogs.teacherId)),
            after ? gt(signLogs.createdAt, new Date(after)) : undefined,
        );

        const [[{ total }], items] = await Promise.all([
            db.select({ total: count() }).from(signLogs).where(where),
            db
                .select(signLogColumns)
                .from(signLogs)
                .where(where)
                .orderBy(desc(signLogs.createdAt), desc(signLogs.id))
                .limit(pageSize)
                .offset(toOffset(page, pageSize)),
        ]);
        return { items, total, page, pageSize };
    },
};
