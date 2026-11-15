import { t } from "elysia";
import { NonEmptyString, Paginated, PaginationQuery, SignLogSource } from "@/backend/utils/model";

const SignLog = t.Object({
    id: t.String(),
    studentName: t.Nullable(t.String()),
    transcript: t.String(),
    source: SignLogSource,
    createdAt: t.Date(),
});

export const SignLogModel = {
    createBody: t.Object({
        transcript: NonEmptyString(1000, { description: "Kalimat hasil terjemahan isyarat atau kartu frasa" }),
        source: SignLogSource,
        studentName: t.Optional(NonEmptyString(100)),
    }),
    listQuery: t.Object({
        ...PaginationQuery.properties,
        after: t.Optional(
            t.String({ format: "date-time", description: "Hanya log setelah waktu ini (untuk polling dashboard)" }),
        ),
    }),
    signLog: SignLog,
    listResponse: Paginated(SignLog),
} as const;

export type CreateSignLogBody = typeof SignLogModel.createBody.static;
export type ListSignLogsQuery = typeof SignLogModel.listQuery.static;
