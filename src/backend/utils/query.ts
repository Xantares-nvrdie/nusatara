import { MAX_PAGE_SIZE } from "./model";

/** Escapes `%`, `_` and `\` so user input is matched literally inside an ILIKE pattern. */
export const escapeLike = (value: string) => value.replace(/[%_\\]/g, (c) => `\\${c}`);

export const toOffset = (page: number, pageSize: number) => (page - 1) * pageSize;

/**
 * Whole number within [min, max], or `fallback` when not a number.
 * The query schemas declare these bounds, but the production Next.js build doesn't enforce them on query strings
 * (verified with `next start`: `pageSize=100000` passed as the string "100000", `page=0` reached Postgres).
 * `next dev` does reject them. Services clamp again so the bounds hold in every build.
 */
export function clampInt(value: unknown, min: number, max: number, fallback: number) {
    const n = Math.trunc(Number(value));
    return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
}

/** Safe page / pageSize for list endpoints (see clampInt). */
export const pageParams = (page: unknown, pageSize: unknown) => ({
    page: clampInt(page, 1, 100_000, 1),
    pageSize: clampInt(pageSize, 1, MAX_PAGE_SIZE, 10),
});

/**
 * True when `error` is a Postgres unique violation (SQLSTATE 23505), optionally on a specific constraint/index.
 * Also checks `cause` because newer Drizzle versions wrap driver errors.
 */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
    for (let current = error, depth = 0; current && depth < 3; depth++) {
        const pgError = current as { code?: unknown; constraint?: unknown; cause?: unknown };
        if (pgError.code === "23505") return constraint === undefined || pgError.constraint === constraint;
        current = pgError.cause;
    }
    return false;
}
