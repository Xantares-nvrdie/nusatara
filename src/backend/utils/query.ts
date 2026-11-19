/** Escapes `%`, `_` and `\` so user input is matched literally inside an ILIKE pattern. */
export const escapeLike = (value: string) => value.replace(/[%_\\]/g, (c) => `\\${c}`);

export const toOffset = (page: number, pageSize: number) => (page - 1) * pageSize;

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
